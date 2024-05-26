const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument, rgb } = require('pdf-lib');
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

            // Create PDF with pdf-lib for fillable fields
            const pdfDoc = await PDFLibDocument.create();
            let page = pdfDoc.addPage([792, 612]);

            let y = page.getHeight() - 30;

            if (companyLogo) {
                const logoPath = path.join(__dirname, companyLogo.path);
                const logoBytes = fs.readFileSync(logoPath);
                const logoImage = await pdfDoc.embedPng(logoBytes);
                page.drawImage(logoImage, {
                    x: 10,
                    y: page.getHeight() - 50 - logoImage.height,
                    width: logoImage.width,
                    height: logoImage.height
                });
                y = page.getHeight() - 60 - logoImage.height;
            }

            page.drawText('Inspection Report', { x: 110, y: y, size: 18 });

            y -= 30;
            page.drawText(`Property Name: ${propertyName}`, { x: 10, y: y, size: 12 });
            page.drawText(`Tenant(s): ${tenants}`, { x: 300, y: y, size: 12 });
            y -= 20;
            page.drawText(`Date: ${inspectionDate}`, { x: 10, y: y, size: 12 });
            page.drawText(`Agent/Inspector: ${agentInspector}`, { x: 300, y: y, size: 12 });

            y -= 30;
            page.drawText('Room/Item', { x: 10, y: y, size: 12 });
            page.drawText('Move In', { x: 210, y: y, size: 12 });
            page.drawText('Move Out', { x: 450, y: y, size: 12 });
            y -= 20;
            page.drawText('Condition', { x: 210, y: y, size: 12 });
            page.drawText('Comments', { x: 270, y: y, size: 12 });
            page.drawText('Photos', { x: 370, y: y, size: 12 });
            page.drawText('Condition', { x: 450, y: y, size: 12 });
            page.drawText('Comments', { x: 510, y: y, size: 12 });
            page.drawText('Photos', { x: 610, y: y, size: 12 });
            y -= 10;
            page.drawLine({
                start: { x: 10, y: y },
                end: { x: 780, y: y },
                thickness: 1,
                color: rgb(0, 0, 0),
            });
            y -= 10;

            const form = pdfDoc.getForm();

            // Add room and item details
            for (const room of rooms) {
                if (y < 100) {
                    page = pdfDoc.addPage([792, 612]);
                    y = page.getHeight() - 100;
                }

                page.drawText(`${room.roomName}`, { x: 10, y: y, size: 14 });
                y -= 20;

                for (const item of room.items) {
                    if (y < 100) {
                        page = pdfDoc.addPage([792, 612]);
                        y = page.getHeight() - 100;
                    }

                    page.drawText(item.itemName, { x: 10, y: y, size: 12 });
                    page.drawText(item.conditionIn, { x: 210, y: y, size: 12 });
                    page.drawText(item.commentsIn, { x: 270, y: y, size: 12 });

                    const photosIn = photosInFiles.filter(photo => photo.fieldname === `photosIn-${room.roomName}-${item.itemName}`);
                    if (photosIn.length > 0) {
                        const resizedImagePath = await resizeImage(photosIn[0].path);
                        const imageBytes = fs.readFileSync(resizedImagePath);
                        const image = await pdfDoc.embedPng(imageBytes);
                        page.drawImage(image, {
                            x: 370,
                            y: y - 30,
                            width: 40,
                            height: 40,
                        });
                    }

                    const conditionOutField = form.createDropdown(`conditionOut-${room.roomName}-${item.itemName}`);
                    conditionOutField.addOptions(['Select', 'New', 'Good', 'Fair', 'Poor']);
                    conditionOutField.select(item.conditionOut || 'Select');
                    conditionOutField.addToPage(page, { x: 450, y: y - 10, width: 50, height: 20 });

                    const commentsOutField = form.createTextField(`commentsOut-${room.roomName}-${item.itemName}`);
                    commentsOutField.setText(item.commentsOut || '');
                    commentsOutField.addToPage(page, { x: 510, y: y - 10, width: 80, height: 20 });

                    const photosOutField = form.createTextField(`photosOut-${room.roomName}-${item.itemName}`);
                    photosOutField.setText('Add Photo');
                    photosOutField.addToPage(page, { x: 610, y: y - 10, width: 50, height: 20 });

                    y -= (photosIn.length > 0) ? 60 : 20; // Adjusting the spacing based on photo presence
                }

                y -= 20;
            }

            const pdfBytes = await pdfDoc.save();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
            res.send(Buffer.from(pdfBytes));

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
