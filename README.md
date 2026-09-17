# ระบบทดสอบออนไลน์เพื่อประเมินผลสัมฤทธิ์ทางการเรียน
### (Online Testing System for Evaluating Academic Achievement)

โครงงานปริญญานิพนธ์ พัฒนาด้วยเทคโนโลยี Modern Full-Stack (Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL/SQLite) พร้อมระบบรักษาความปลอดภัยและการยืนยันตัวตนระดับ Enterprise

---

## 🌟 จุดเด่นและคุณสมบัติหลักของระบบ (Milestone 1)

1. **Authentication & Authorization แท้จริง**:
   - ระบบ Login / Logout ด้วย JWT (JSON Web Token) และ Signed HttpOnly Cookie
   - เข้ารหัสรหัสผ่านด้วย `Bcrypt` (Salt Rounds = 10) ปลอดภัย ไม่เก็บ Plain Text
   - รองรับ 3 User Roles: `ADMIN`, `TEACHER`, `STUDENT`
   - Edge Middleware และ Server Guards ป้องกัน Route และตรวจสอบสิทธิ์แบบ Real-time
2. **Database Schema ครบวงจร**:
   - รองรับ Users, Roles, Courses, CourseEnrollments
   - คลังข้อสอบ (Question Categories, Questions, Choices)
   - ชุดแบบทดสอบ (Exams, ExamQuestions)
   - ประวัติและผลการสอบ (ExamAttempts, StudentAnswers, ExamLogs สำหรับตรวจจับการทุจริต)
3. **Seed Data พร้อมทดสอบ**:
   - บัญชีตัวอย่างครบทุก Role (Admin, Teacher, 3 Students)
   - รายวิชาตัวอย่าง หมวดหมู่ข้อสอบ โจทย์คำถาม ตัวเลือก และผลการสอบตัวอย่าง

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, Lucide React
- **Backend API**: Next.js Route Handlers (Node.js Runtime)
- **Database & ORM**: Prisma ORM v5 (รองรับ SQLite สำหรับ Local Development และ PostgreSQL สำหรับ Production)
- **Security & Auth**: Bcryptjs, Jose (JWT), HTTP-Only Secure Cookies, Zod Validation

---

## 🚀 วิธีการติดตั้งและเริ่มใช้งาน (Installation & Setup)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` ไปเป็น `.env`
```bash
cp .env.example .env
```
ตรวจสอบตัวแปรใน `.env`:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="online_testing_system_jwt_secret_key_change_in_production_2026"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. สร้าง Database Schema & Generate Prisma Client
```bash
npx prisma db push
```
หรือ
```bash
npx prisma generate
```

### 4. Seed ข้อมูลทดสอบเริ่มต้น (Development Seed)
```bash
npm run db:seed
```

### 5. รันโปรเจกต์ (Development Mode)
```bash
npm run dev
```
เปิดเบราว์เซอร์และเข้าไปที่: [http://localhost:3000](http://localhost:3000)

---

## 🔑 บัญชีสำหรับทดสอบระบบ (Seed Test Accounts)

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน (Password) | สิทธิ์และการเข้าถึง |
| :--- | :--- | :--- | :--- |
| **ผู้ดูแลระบบ (ADMIN)** | `admin@test.com` | `admin1234` | เข้าถึง `/admin/dashboard` จัดการผู้ใช้และระบบ |
| **อาจารย์ผู้สอน (TEACHER)** | `teacher@test.com` | `teacher1234` | เข้าถึง `/instructor/dashboard` จัดการวิชา คลังข้อสอบ และชุดสอบ |
| **นักศึกษา 1 (STUDENT)** | `student1@test.com` | `student1234` | เข้าถึง `/student/dashboard` ทำแบบทดสอบ ดูผลคะแนน |
| **นักศึกษา 2 (STUDENT)** | `student2@test.com` | `student1234` | เข้าถึง `/student/dashboard` |
| **นักศึกษา 3 (STUDENT)** | `student3@test.com` | `student1234` | เข้าถึง `/student/dashboard` |

*(ในหน้า Login จะมีปุ่มคลิกเดียวเพื่อใส่ข้อมูลบัญชีทดสอบโดยอัตโนมัติ)*

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
OnlineTestingSystem/
├── prisma/
│   ├── schema.prisma            # นิยาม Database Models & Relations
│   └── seed.js                  # สคริปต์สร้างข้อมูลจำลองเพื่อการทดสอบ
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx   # หน้า Login
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       # Layout สำหรับ Dashboard (ตรวจ Auth Server-side)
│   │   │   ├── admin/dashboard/ # หน้า Dashboard ของ Admin
│   │   │   ├── instructor/dashboard/ # หน้า Dashboard ของ Teacher
│   │   │   └── student/dashboard/    # หน้า Dashboard ของ Student
│   │   ├── api/
│   │   │   ├── auth/login/      # API Login (ตรวจสอบ Bcrypt & ออก JWT)
│   │   │   ├── auth/logout/     # API Logout (เคลียร์ Cookie)
│   │   │   ├── auth/me/         # API ดึงข้อมูลผู้ใช้ปัจจุบัน
│   │   │   └── health/          # API Health Check
│   │   ├── globals.css          # Tailwind CSS styles
│   │   ├── layout.tsx           # Root Layout
│   │   └── page.tsx             # Root Landing Page (Redirect ตาม Role)
│   ├── components/
│   │   └── layout/
│   │       ├── Navbar.tsx       # Navigation Bar ด้านบนพร้อมปุ่ม Logout
│   │       └── Sidebar.tsx      # แถบเมนูด้านข้างแยกตาม Role
│   ├── lib/
│   │   ├── auth.ts              # ฟังก์ชัน Bcrypt & JWT Jose Helpers
│   │   ├── guards.ts            # Server-side Auth & Role Guards
│   │   ├── prisma.ts            # Prisma Client Singleton
│   │   └── utils.ts             # Tailwind classnames merge helper
│   ├── types/
│   │   └── auth.ts              # Type definitions (Roles, SessionPayload)
│   └── middleware.ts            # Edge Middleware ป้องกัน Route และ RBAC
├── .env.example                 # ตัวอย่างการตั้งค่า Environment
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 🧪 คำสั่งสำหรับการทดสอบและการ Build

```bash
# ตรวจสอบ TypeScript & Linter
npm run lint

# Build สำหรับ Production
npm run build

# รันโหมด Production
npm run start
```
