const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sharp = require('sharp');

const app = express();
const port = process.env.PORT || 3000;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'companyLogo' || file.fieldname.startsWith('photosIn') || file.fieldname.startsWith('photosOut')) {
            cb(null, true);
        } else {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        }
    }
}).any();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/submit-form', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Error uploading files:', err);
            return res.status(500).send('Error uploading files');
        }

        try {
            console.log('Received form data:', req.body);
            console.log('Uploaded files:', req.files);

            const propertyName = req.body.propertyName || '';
            const tenants = req.body.tenants || '';
            const inspectionDate = req.body.inspectionDate || '';
            const agentInspector = req.body.agentInspector || '';
            const rooms = [];
            const companyLogo = req.files.find(file => file.fieldname === 'companyLogo');
            const photosInFiles = req.files.filter(file => file.fieldname.startsWith('photosIn'));
            const photosOutFiles = req.files.filter(file => file.fieldname.startsWith('photosOut'));

            Object.keys(req.body).forEach(key => {
                const [prefix, roomName, itemName] = key.split('-');
                const value = req.body[key];

                if (prefix === 'conditionIn' || prefix === 'conditionOut' || prefix === 'commentsIn' || prefix === 'commentsOut') {
                    let room = rooms.find(r => r.roomName === roomName);
                    if (!room) {
                        room = { roomName, items: [] };
                        rooms.push(room);
                    }

                    let item = room.items.find(i => i.itemName === itemName);
                    if (!item) {
                        item = { itemName, conditionIn: '', commentsIn: '', photosIn: [], conditionOut: '', commentsOut: '', photosOut: [] };
                        room.items.push(item);
                    }

                    item[prefix] = value;
                }
            });

            const doc = new PDFDocument({ size: 'letter', layout: 'landscape', margin: 10 });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');

            doc.pipe(res);

            // Add company logo and header details on the first page
            if (companyLogo) {
                const logoPath = path.join(__dirname, companyLogo.path);
                try {
                    doc.image(logoPath, 10, 10, { width: 100 });
                } catch (imageError) {
                    console.error('Error adding company logo to PDF:', imageError);
                }
            }

            doc.fontSize(18).text('Inspection Report', 110, 10);

            doc.fontSize(12).text(`Property Name: ${propertyName}`, 10, 50);
            doc.text(`Tenant(s): ${tenants}`, 300, 50);
            doc.text(`Date: ${inspectionDate}`, 10, 70);
            doc.text(`Agent/Inspector: ${agentInspector}`, 300, 70);

            const generateTableHeader = () => {
                doc.fontSize(12);
                doc.text('Room/Item', 10, y, { width: 100 });
                doc.text('Move In', 210, y, { width: 180, align: 'center' });
                doc.text('Move Out', 450, y, { width: 180, align: 'center' });
                y += 20;
                doc.text('Condition', 210, y, { width: 60 });
                doc.text('Comments', 270, y, { width: 100 });
                doc.text('Photos', 370, y, { width: 60 });
                doc.text('Condition', 450, y, { width: 60 });
                doc.text('Comments', 510, y, { width: 100 });
                doc.text('Photos', 610, y, { width: 60 });
                y += 10;
                doc.moveTo(10, y).lineTo(780, y).stroke(); // Draw underline
                y += 10;
            };

            let y = 100;

            generateTableHeader();

            // Add room and item details
            for (const room of rooms) {
                if (y > doc.page.height - 50) {
                    doc.addPage();
                    y = 30;
                    generateTableHeader();
                }

                doc.fontSize(14).text(`${room.roomName}`, 10, y);
                y += 20;

                for (const item of room.items) {
                    if (y > doc.page.height - 50) {
                        doc.addPage();
                        y = 30;
                        generateTableHeader();
                    }

                    doc.fontSize(12).text(item.itemName, 10, y, { width: 100 });
                    doc.text(item.conditionIn, 210, y, { width: 60 });
                    doc.text(item.commentsIn, 270, y, { width: 100 });

                    const photosIn = photosInFiles.filter(photo => photo.fieldname === `photosIn-${room.roomName}-${item.itemName}`);
                    if (photosIn.length > 0) {
                        try {
                            const resizedImagePath = await resizeImage(photosIn[0].path);
                            doc.image(resizedImagePath, 370, y, { width: 40, height: 40 });
                        } catch (photoError) {
                            console.error('Error adding move-in photo to PDF:', photoError);
                        }
                    }

                    doc.text(item.conditionOut, 450, y, { width: 60 });
                    doc.text(item.commentsOut, 510, y, { width: 100 });

                    const photosOut = photosOutFiles.filter(photo => photo.fieldname === `photosOut-${room.roomName}-${item.itemName}`);
                    if (photosOut.length > 0) {
                        try {
                            const resizedImagePath = await resizeImage(photosOut[0].path);
                            doc.image(resizedImagePath, 610, y, { width: 40, height: 40 });
                        } catch (photoError) {
                            console.error('Error adding move-out photo to PDF:', photoError);
                        }
                    }

                    y += 60;
                }

                y += 20;
            }

            doc.end();

            const cleanupFiles = async (files) => {
                for (const file of files) {
                    try {
                        await fs.promises.unlink(file.path);
                    } catch (unlinkError) {
                        console.error('Error cleaning up file:', unlinkError);
                    }
                }
            };

            await cleanupFiles([...photosInFiles, ...photosOutFiles]);
            if (companyLogo) {
                await cleanupFiles([companyLogo]);
            }

        } catch (error) {
            console.error('Error processing form:', error);
            res.status(500).send('Internal Server Error');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Function to resize images
async function resizeImage(filePath) {
    const outputFilePath = filePath.replace(/(\.[\w\d_-]+)$/i, '_resized$1');
    try {
        await sharp(filePath)
            .resize(100, 100)
            .toFile(outputFilePath);
        return outputFilePath;
    } catch (error) {
        console.error('Error resizing image:', error);
        throw error;
    }
}
