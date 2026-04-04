# TTM - ระบบจองคิวการแพทย์ออนไลน์

ระบบจองคิวการแพทย์ออนไลน์สำหรับคลินิก TTM พัฒนาด้วย Next.js 16, TypeScript, และ Prisma

## 🚀 ฟีเจอร์หลัก

- 📅 **จองคิวออนไลน์** - จองนัดหมายแพทย์ผ่านเว็บไซต์
- 👨‍⚕️ **จัดการแพทย์** - จัดการข้อมูลแพทย์และตารางเวลา
- 🏥 **จัดการสาขา** - จัดการข้อมูลสาขาคลินิก
- 📱 **LINE Bot** - รับการแจ้งเตือนผ่าน LINE
- 🔐 **การยืนยันตัวตน** - รองรับ Provider ID และ Health ID
- 📊 **รายงาน** - รายงานสถิติการจองคิว
- 📋 **ประวัติการจอง** - ดูประวัติการจองคิวของผู้ป่วย

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend:** Next.js 16, React 19, TypeScript
- **UI:** TailwindCSS, HeroUI
- **Backend:** Next.js API Routes
- **Database:** MySQL กับ Prisma ORM
- **Authentication:** NextAuth.js v5
- **Deployment:** Vercel

## 📋 การติดตั้ง

### 1. Clone Repository
```bash
git clone https://github.com/tehnplk/ttm.git
cd ttm
```

### 2. ติดตั้ง Dependencies
```bash
bun install
# หรือ
npm install
```

### 3. ตั้งค่า Environment Variables
```bash
cp .env.example .env.local
```

แล้วแก้ไขค่าใน `.env.local` ตามความเหมาะสม:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3307/database_name"

# LINE Bot
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token

# Authentication
AUTH_SECRET="your-auth-secret"
AUTH_URL=http://localhost:3000

# Health ID
HEALTH_CLIENT_ID=your-health-client-id
HEALTH_CLIENT_SECRET=your-health-client-secret
HEALTH_REDIRECT_URI=http://localhost:3000/api/auth/healthid

# Provider ID
PROVIDER_CLIENT_ID=your-provider-client-id
PROVIDER_CLIENT_SECRET=your-provider-client-secret
PROVIDER_REDIRECT_URI=http://localhost:3000/login
```

### 4. ตั้งค่า Database
```bash
# สร้าง Prisma client
npx prisma generate

# รัน migrations (ถ้ามี)
npx prisma migrate dev
```

### 5. เริ่ม Development Server
```bash
bun run dev
# หรือ
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) ใน browser

## 📁 โครงสร้างโปรเจกต์

```
ttm/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── admin/          # หน้า admin
│   │   ├── backoffice/     # หน้า backoffice
│   │   ├── booking/        # หน้าจองคิว
│   │   └── api/            # API Routes
│   ├── components/         # React Components
│   ├── lib/               # Utility functions
│   └── types/             # TypeScript types
├── prisma/                # Database schema & migrations
├── public/                # Static files
└── docs/                  # Documentation
```

## 🔐 การยืนยันตัวตน

ระบบรองรับวิธีการยืนยันตัวตน:

1. **Provider ID** - ผ่าน provider.id.th
2. **Health ID** - ผ่าน moph.id.th
3. **LINE Login** - ผ่าน LINE Platform

## 📱 LINE Bot Integration

- รับการแจ้งเตือนการจองคิว
- ส่งข้อความยืนยันการนัดหมาย
- ตรวจสอบสถานะการจองคิว

## 🚀 Deployment

### Vercel (แนะนำ)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables สำหรับ Production
- `AUTH_URL=https://your-domain.com`
- `HEALTH_REDIRECT_URI=https://your-domain.com/api/auth/healthid`
- `PROVIDER_REDIRECT_URI=https://your-domain.com/login`
- `NEXT_PUBLIC_BOOKING_URL=https://your-domain.com`

## 📝 API Documentation

### Booking API
- `POST /api/bookings` - สร้างการจองคิวใหม่
- `GET /api/bookings/by-phone` - ค้นหาการจองตามเบอร์โทรศัพท์
- `GET /api/bookings/history` - ดูประวัติการจอง

### Admin API
- `GET /api/admin/dashboard` - ข้อมูล Dashboard
- `GET /api/admin/bookings` - จัดการการจองคิว
- `POST /api/admin/broadcasts` - ส่งข้อความ broadcast

## 🤝 การมีส่วนร่วม

1. Fork โปรเจกต์
2. สร้าง feature branch (`git checkout -b feature/amazing-feature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add amazing feature'`)
4. Push ไปยัง branch (`git push origin feature/amazing-feature`)
5. เปิด Pull Request

## 📄 License

โปรเจกต์นี้ใช้ License สำหรับการพัฒนาภายในองค์กร

## 📞 ติดต่อ

สำหรับข้อมูลเพิ่มเติม ติดต่อทีมพัฒนา TTM

---

**Developed with ❤️ for TTM Clinic**
