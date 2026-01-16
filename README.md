# 🎓 RFID Attendance System

A simple school attendance tracking system using RFID cards. Built with Node.js, Express, and vanilla JavaScript.

## 📋 Features

- ✅ Record attendance with RFID card ID
- 📊 View recent attendance records
- 🗑️ Clear all records (admin function)
- 💾 In-memory storage (data resets on server restart)
- 🎨 Clean, responsive UI

## 🚀 How to Run

### Prerequisites
- Node.js installed on your computer ([Download here](https://nodejs.org/))

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the Server
```bash
npm start
```
Or:
```bash
node app.js
```

### Step 3: Open Dashboard
Open your browser and go to:
```
http://localhost:3000
```

You should see the Teacher Dashboard!

## 🧪 Testing the System

1. **Record Attendance:**
   - Enter a card ID (e.g., "CARD12345")
   - Click "Record Attendance"
   - You'll see a success message

2. **View Records:**
   - Click "Refresh Records" to see all entries
   - The most recent 10 records are displayed

3. **Clear Data:**
   - Use "Clear All Records" to reset (testing only)

## 📁 Project Structure

```
rfid-attendance-system/
├── app.js              # Backend server (Express)
├── package.json        # Dependencies
├── public/
│   ├── index.html     # Teacher dashboard UI
│   ├── style.css      # Styling
│   └── script.js      # Frontend JavaScript
└── README.md          # This file
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attendance` | Record new attendance |
| GET | `/attendance` | Get all records |
| GET | `/attendance/latest` | Get latest 10 records |
| DELETE | `/attendance/clear` | Clear all records |

### Example POST Request:
```json
POST /attendance
{
  "cardId": "CARD12345",
  "time": "2024-01-16T10:30:00.000Z"
}
```

## 🎯 Next Steps (Future Enhancements)

- [ ] Add database (MongoDB/MySQL) for persistent storage
- [ ] Implement student name lookup by card ID
- [ ] Add authentication for teachers
- [ ] Export attendance reports (CSV/PDF)
- [ ] Real RFID hardware integration
- [ ] Deployment to cloud (Heroku, Railway, etc.)

## 🛠️ Troubleshooting

**Server won't start:**
- Check if port 3000 is already in use
- Run `npm install` again

**Can't connect to server:**
- Make sure server is running (`node app.js`)
- Check the URL is `http://localhost:3000`

**No records showing:**
- Click "Refresh Records" button
- Check browser console for errors (F12)

## 📚 Learning Points

- **Express.js:** Setting up routes and middleware
- **RESTful API:** Creating GET, POST, DELETE endpoints
- **Async/Await:** Handling asynchronous operations
- **Fetch API:** Making HTTP requests from frontend
- **DOM Manipulation:** Updating UI dynamically

## 📝 License

MIT - Feel free to use this for learning!

---

Built with ❤️ for learning backend development