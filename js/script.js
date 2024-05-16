document.addEventListener('DOMContentLoaded', function () {
    const addRoomButton = document.getElementById('addRoomButton');
    const roomsTableBody = document.getElementById('roomsTableBody');

    addRoomButton.onclick = function () {
        addCustomRoom();
    };

    function addCustomRoom() {
        const roomName = prompt("Enter room name:");
        if (roomName) {
            addRoom(roomName, []);
        }
    }

    function addRoom(roomName, items) {
        const roomRow = document.createElement('tr');
        const roomId = `room-${Date.now()}`;
        roomRow.setAttribute('data-room-id', roomId);
        roomRow.innerHTML = `
            <td colspan="7"><strong>${roomName}</strong></td>
            <td>
                <button type="button" class="editRoomButton">Edit</button>
                <button type="button" class="removeRoomButton">Remove</button>
                <button type="button" class="addItemButton">Add Item</button>
            </td>
        `;
        roomsTableBody.appendChild(roomRow);

        items.forEach(item => addItem(roomRow, roomId, roomName, item));

        roomRow.querySelector('.editRoomButton').onclick = function () {
            const newRoomName = prompt("Enter new room name:", roomName);
            if (newRoomName) {
                roomRow.firstChild.innerHTML = `<strong>${newRoomName}</strong>`;
            }
        };

        roomRow.querySelector('.removeRoomButton').onclick = function () {
            const roomItems = document.querySelectorAll(`tr[data-room-id="${roomId}"]`);
            roomItems.forEach(item => item.remove());
        };

        roomRow.querySelector('.addItemButton').onclick = function () {
            const itemName = prompt("Enter item name:");
            if (itemName) {
                addItem(roomRow, roomId, roomName, itemName);
            }
        };
    }

    function addItem(roomRow, roomId, roomName, itemName) {
        const itemRow = document.createElement('tr');
        itemRow.setAttribute('data-room-id', roomId);
        itemRow.innerHTML = `
            <td>${itemName}</td>
            <td>
                <select name="conditionIn-${roomName}-${itemName}">
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                </select>
            </td>
            <td><input type="text" name="commentsIn-${roomName}-${itemName}"></td>
            <td><input type="file" name="photosIn-${roomName}-${itemName}"></td>
            <td>
                <select name="conditionOut-${roomName}-${itemName}">
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                </select>
            </td>
            <td><input type="text" name="commentsOut-${roomName}-${itemName}"></td>
            <td><input type="file" name="photosOut-${roomName}-${itemName}"></td>
            <td><button type="button" class="removeItemButton">Remove</button></td>
        `;
        roomRow.insertAdjacentElement('afterend', itemRow);

        itemRow.querySelector('.removeItemButton').onclick = function () {
            itemRow.remove();
        };
    }

    // Quick add buttons
    document.getElementById('quickAddLivingRoom').onclick = function () {
        addRoom('Living Room', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents', 'Fireplace', 'Blinds/Curtains']);
    };

    document.getElementById('quickAddKitchen').onclick = function () {
        addRoom('Kitchen', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents', 'Cabinets', 'Countertops', 'Sink', 'Appliances']);
    };

    document.getElementById('quickAddBedroom').onclick = function () {
        addRoom('Bedroom', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents', 'Closet', 'Blinds/Curtains']);
    };

    document.getElementById('quickAddBathroom').onclick = function () {
        addRoom('Bathroom', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents', 'Sink', 'Toilet', 'Shower/Bathtub']);
    };

    document.getElementById('quickAddDiningRoom').onclick = function () {
        addRoom('Dining Room', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents', 'Blinds/Curtains']);
    };

    document.getElementById('quickAddLaundryRoom').onclick = function () {
        addRoom('Laundry Room', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents', 'Washer', 'Dryer']);
    };

    document.getElementById('quickAddGarage').onclick = function () {
        addRoom('Garage', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents']);
    };

    document.getElementById('quickAddEntrywayHallway').onclick = function () {
        addRoom('Entryway/Hallway', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents']);
    };

    document.getElementById('quickAddOfficeStudy').onclick = function () {
        addRoom('Office/Study', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents', 'Blinds/Curtains']);
    };

    document.getElementById('quickAddBasement').onclick = function () {
        addRoom('Basement', ['Walls', 'Flooring', 'Windows', 'Doors', 'Electrical Outlets', 'Light Fixtures', 'Ceiling Fan', 'HVAC Vents']);
    };
});
