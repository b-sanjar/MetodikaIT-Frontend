import { CURRICULUM } from './curriculum'
import type {
  BadgeDef,
  ClassGroup,
  JournalColumn,
  JournalEntry,
  Lesson,
  QuarterInfo,
  Student,
  Teacher,
  User,
} from '../types'

export const BADGES: BadgeDef[] = [
  { id: 'star', name: 'Yulduzcha', description: 'Darsda 5 baho olgani uchun' },
  { id: 'streak', name: 'Faol ishtirokchi', description: '5 dars ketma-ket faol qatnashgani uchun' },
  { id: 'project', name: 'Loyiha ustasi', description: 'Yakuniy loyihani a’lo himoya qilgani uchun' },
  { id: 'helper', name: 'Yordamchi', description: 'Sinfdoshlariga yordam bergani uchun' },
  { id: 'speed', name: 'Tezkor', description: 'Amaliy topshiriqni birinchi bo‘lib bajargani uchun' },
]

export const USERS: User[] = [
  {
    id: 'u-admin',
    name: 'Aziz Rahmonov',
    login: 'admin',
    password: 'admin',
    role: 'admin',
    title: 'Platforma administratori',
    photo: '',
  },
  {
    id: 'u-viewer',
    name: 'Nodira Alimova',
    login: 'rahbar',
    password: 'rahbar',
    role: 'viewer',
    title: 'O‘quv ishlari bo‘yicha direktor o‘rinbosari',
    photo: '',
  },
]

export const TEACHERS: Teacher[] = [
  {
    id: 't1',
    name: 'Dilshod Karimov',
    phone: '+998 90 123 45 67',
    email: 'd.karimov@maktab.uz',
    classIds: ['c-5a', 'c-7b'],
    login: 'karimov',
    password: '1234',
    photo: '',
  },
  {
    id: 't2',
    name: 'Malika Yusupova',
    phone: '+998 91 234 56 78',
    email: 'm.yusupova@maktab.uz',
    classIds: ['c-3a'],
    login: 'yusupova',
    password: '1234',
    photo: '',
  },
  {
    id: 't3',
    name: 'Jasur Toshpo‘latov',
    phone: '+998 93 345 67 89',
    email: 'j.toshpulatov@maktab.uz',
    classIds: ['c-9a'],
    login: 'toshpulatov',
    password: '1234',
    photo: '',
  },
]

export const CLASSES: ClassGroup[] = [
  { id: 'c-3a', grade: 3, letter: 'A', teacherId: 't2' },
  { id: 'c-5a', grade: 5, letter: 'A', teacherId: 't1' },
  { id: 'c-7b', grade: 7, letter: 'B', teacherId: 't1' },
  { id: 'c-9a', grade: 9, letter: 'A', teacherId: 't3' },
]

const STUDENT_NAMES: Record<string, string[]> = {
  'c-3a': [
    'Aziza Rustamova',
    'Bekzod Nazarov',
    'Kamila Sodiqova',
    'Timur Aliyev',
    'Sevinch Qodirova',
    'Amir Hakimov',
    'Zilola Ergasheva',
    'Doston Yo‘ldoshev',
  ],
  'c-5a': [
    'Muhammadali Rahimov',
    'Iroda Sattorova',
    'Javohir Umarov',
    'Madina Karimova',
    'Sardor Mirzayev',
    'Nilufar Tosheva',
    'Otabek Salimov',
    'Shahzoda Azizova',
    'Ulug‘bek Norov',
    'Gulnoza Ismoilova',
  ],
  'c-7b': [
    'Abbos Xolmatov',
    'Dilnoza Yunusova',
    'Farrux Abdullayev',
    'Laylo Mahmudova',
    'Mirjalol Sobirov',
    'Ozoda Nabiyeva',
    'Rustam G‘aniyev',
    'Sabina Olimova',
    'Xurshid Berdiyev',
    'Yulduz Hamidova',
  ],
  'c-9a': [
    'Akmal Sharipov',
    'Barno Mo‘minova',
    'Eldor Raximov',
    'Feruza Kamolova',
    'G‘ayrat Usmonov',
    'Hilola Saidova',
    'Islom Tursunov',
    'Jamila Ahmedova',
  ],
}

const BADGE_POOL = ['star', 'streak', 'project', 'helper', 'speed']

export function buildStudents(): Student[] {
  const students: Student[] = []
  let n = 0
  for (const [classId, names] of Object.entries(STUDENT_NAMES)) {
    names.forEach((name, i) => {
      n += 1
      // Deterministic but varied points/badges so the leaderboard looks alive
      const points = 40 + ((n * 37 + i * 13) % 260)
      const badgeCount = points > 240 ? 3 : points > 160 ? 2 : points > 90 ? 1 : 0
      const badges = Array.from({ length: badgeCount }, (_, k) => BADGE_POOL[(n + k) % BADGE_POOL.length])
      students.push({ id: `s${n}`, name, classId, points, badges: [...new Set(badges)] })
    })
  }
  return students
}

// ---------- Lesson body generation ----------

const EQUIPMENT_BASE = ['Kompyuter sinfi', 'Proyektor yoki interaktiv doska', 'Tarqatma materiallar']

function objectiveFor(title: string, grade: number): string {
  return `O‘quvchilarga «${title}» mavzusini amaliy misollar orqali tushuntirish, ${grade}-sinf dasturiga mos nazariy bilim va amaliy ko‘nikmalarni shakllantirish.`
}

function theoryFor(title: string): string[] {
  return [
    `Dars «${title}» mavzusiga bag‘ishlanadi. Kirish qismida o‘tgan dars takrorlanadi va yangi mavzu kundalik hayotdagi misollar bilan bog‘lab boshlanadi.`,
    'Asosiy tushunchalar doskada yoki taqdimotda bosqichma-bosqich ochib beriladi: ta’rif, asosiy xossalar va qo‘llanish sohalari. Har bir tushuncha kamida bitta jonli misol bilan mustahkamlanadi.',
    'Namoyish qismida o‘qituvchi mavzuga oid amaliy jarayonni proyektor orqali ko‘rsatadi, o‘quvchilar esa asosiy qadamlarni daftarga qayd etib boradi.',
    'Yakunida savol-javob o‘tkaziladi: o‘quvchilar mavzu bo‘yicha 2–3 nazorat savoliga og‘zaki javob beradi va tushunmagan joylari aniqlanadi.',
  ]
}

function practiceFor(title: string): string[] {
  return [
    `«${title}» mavzusi bo‘yicha o‘qituvchi ko‘rsatgan amallarni kompyuterda mustaqil takrorlash.`,
    'Juftlikda ishlash: tarqatma materialdagi topshiriqni bajarish va natijani sinfdoshi bilan solishtirish.',
    'Mustaqil topshiriq: mavzuga oid kichik masalani yechish va natijani o‘qituvchiga ko‘rsatish.',
  ]
}

function homeworkFor(title: string): string {
  return `«${title}» mavzusi bo‘yicha daftardagi konspektni o‘qib kelish va mavzuga oid 3 ta misolni mustaqil bajarish. Qo‘shimcha: mavzu yuzasidan bitta savol tayyorlab kelish.`
}

function outcomesFor(title: string): string[] {
  return [
    `«${title}» mavzusidagi asosiy tushunchalarni ta’riflay oladi`,
    'Mavzuga oid amaliy topshiriqni mustaqil bajara oladi',
    'Olingan bilimni kundalik misollar bilan bog‘lay oladi',
  ]
}

/** Template body for a newly added lesson — the teacher refines it later. */
export function generateLessonBody(title: string, grade: number) {
  return {
    objective: objectiveFor(title, grade),
    theory: theoryFor(title),
    practice: practiceFor(title),
    homework: homeworkFor(title),
    equipment: EQUIPMENT_BASE,
    outcomes: outcomesFor(title),
  }
}

// Hand-written rich bodies for flagship lessons, keyed by `${grade}-${quarter}-${order}`.
const RICH: Record<string, Partial<Lesson>> = {
  '5-1-1': {
    objective:
      'O‘quvchilarda informatika fani, uning o‘rganish obyekti va zamonaviy hayotdagi o‘rni haqida yaxlit tasavvur hosil qilish; xavfsiz ishlash qoidalari bilan tanishtirish.',
    theory: [
      'Informatika — axborotni yig‘ish, saqlash, qayta ishlash va uzatish usullarini o‘rganuvchi fan. Darsning kirish qismida o‘quvchilardan «Axborot deganda nimani tushunasiz?» deb so‘raladi va javoblar doskaga yozib boriladi.',
      'Axborotning kundalik hayotdagi ko‘rinishlari muhokama qilinadi: kitobdagi matn, telefondagi xabar, svetofor signali, ob-havo ma’lumoti. Shu misollar orqali axborot turlari (matnli, tasviriy, tovushli, sonli) ajratib ko‘rsatiladi.',
      'Kompyuter — axborotni qayta ishlovchi universal qurilma ekani tushuntiriladi. Informatika xonasida ishlashning xavfsizlik qoidalari birma-bir ko‘rib chiqiladi: ekranga to‘g‘ri masofa, o‘tirish holati, elektr xavfsizligi.',
      'Yakunida «Informatika bizga nima uchun kerak?» mavzusida 3 daqiqalik erkin suhbat o‘tkaziladi va fanning yillik yo‘l xaritasi (choraklar bo‘yicha) taqdimotda ko‘rsatiladi.',
    ],
    practice: [
      'Sinf ikki guruhga bo‘linadi: har bir guruh 5 ta kundalik axborot misolini topib, turini (matn, tasvir, tovush, son) aniqlaydi.',
      'Ish o‘rnini to‘g‘ri tashkil qilish mashqi: har bir o‘quvchi o‘z kompyuteri oldida to‘g‘ri o‘tirish holatini ko‘rsatadi.',
      'Xavfsizlik qoidalari bo‘yicha «To‘g‘ri yoki noto‘g‘ri» o‘yini: o‘qituvchi vaziyat aytadi, o‘quvchilar kartochka ko‘taradi.',
    ],
    homework:
      'Uyda oila a’zolaridan qanday axborot manbalaridan foydalanishini so‘rab, kamida 5 ta misolni daftarga yozib kelish. Har bir misol qarshisiga axborot turini belgilash.',
    outcomes: [
      'Informatika fanining o‘rganish obyektini ta’riflay oladi',
      'Axborot turlarini kundalik misollarda ajrata oladi',
      'Kompyuter xonasida xavfsiz ishlash qoidalariga amal qiladi',
    ],
    equipment: ['Kompyuter sinfi', 'Proyektor', 'Xavfsizlik qoidalari plakati', '«To‘g‘ri/Noto‘g‘ri» kartochkalari'],
  },
  '7-2-1': {
    objective:
      'O‘quvchilarni Python dasturlash tili, uning imkoniyatlari va ishlab chiqish muhiti bilan tanishtirish; birinchi dasturni yozish va ishga tushirish ko‘nikmasini shakllantirish.',
    theory: [
      'Python — o‘qilishi oson, keng qo‘llaniladigan dasturlash tili. U sun’iy intellekt, veb-saytlar, o‘yinlar va ilmiy hisob-kitoblarda ishlatilishi haqiqiy mahsulotlar misolida (YouTube, Instagram) ko‘rsatiladi.',
      'Dasturlash muhiti bilan tanishuv: IDLE yoki onlayn muhit (replit) ochiladi, kod oynasi va natija oynasi farqi tushuntiriladi.',
      'Birinchi dastur an’anaviy print("Salom, dunyo!") misolida yoziladi. print() funksiyasining vazifasi, qavslar va qo‘shtirnoqlarning ahamiyati alohida ta’kidlanadi.',
      'Sintaksis xatolar bilan tanishuv: qo‘shtirnoq tushirib qoldirilsa nima bo‘lishini o‘qituvchi ataylab ko‘rsatadi — xato xabarini o‘qish ham dasturchining muhim ko‘nikmasi ekani aytiladi.',
    ],
    practice: [
      'print() yordamida o‘z ismi va maktab nomini ekranga chiqaruvchi dastur yozish.',
      'Uch qatorli «vizitka» dasturi: ism, sinf, sevimli fan — har biri alohida print() bilan.',
      'Ataylab buzilgan 3 ta kod namunasidagi xatolarni topib to‘g‘rilash (qo‘shtirnoq, qavs, imlo).',
    ],
    homework:
      'print() funksiyasidan foydalanib, o‘zi haqida 5 qatorli ma’lumot chiqaruvchi dastur yozib kelish. Qo‘shimcha: Python ishlatilgan 3 ta mashhur mahsulotni internetdan topish.',
    outcomes: [
      'Python tilining qo‘llanish sohalarini sanab bera oladi',
      'Dasturlash muhitida yangi fayl yaratib, dasturni ishga tushira oladi',
      'print() funksiyasi bilan ekranga ma’lumot chiqara oladi va oddiy sintaksis xatoni topa oladi',
    ],
    equipment: ['Kompyuter sinfi (Python o‘rnatilgan)', 'Proyektor', 'Xato kod namunalari tarqatmasi'],
  },
  '5-3-1': {
    objective:
      'Algoritm tushunchasini kundalik hayot misollari orqali shakllantirish, algoritmning asosiy xossalarini (aniqlik, tugallanganlik, natijaviylik) tushuntirish.',
    theory: [
      'Dars «Choy damlash» misolidan boshlanadi: o‘quvchilar jarayonni qadamlarga bo‘lib aytadi, o‘qituvchi doskaga yozadi. Shu tariqa algoritm — maqsadga erishish uchun bajariladigan aniq qadamlar ketma-ketligi ekani ochib beriladi.',
      'Algoritm xossalari misollar bilan ko‘riladi: aniqlik (har bir qadam bir ma’noli), tugallanganlik (qadamlar soni chekli), natijaviylik (oxirida natija bo‘lishi shart).',
      'Noto‘g‘ri tuzilgan algoritm misoli tahlil qilinadi: qadamlar o‘rni almashtirilsa (choyni damlab, keyin suv qaynatish) natija buzilishi ko‘rsatiladi.',
      'Ijrochi tushunchasi kiritiladi: odam, robot, kompyuter — har bir ijrochining o‘z buyruqlar tizimi bo‘lishi tushuntiriladi.',
    ],
    practice: [
      '«Maktabga kelish» algoritmini 6–8 qadamda daftarga yozish va juftlikda tekshirish.',
      'Aralashtirib berilgan qadamlarni to‘g‘ri tartibga keltirish (tarqatma kartochkalar bilan).',
      '«Robot-ijrochi» o‘yini: bir o‘quvchi buyruq beradi, ikkinchisi faqat aytilganini bajaradi — aniq bo‘lmagan buyruqlar muammosi jonli ko‘rinadi.',
    ],
    homework:
      'Uyda biror kundalik ish (masalan, nonushta tayyorlash) algoritmini kamida 8 qadamda yozib kelish va algoritm xossalariga mosligini tekshirish.',
    outcomes: [
      'Algoritm tushunchasiga ta’rif bera oladi va kundalik misol keltira oladi',
      'Algoritmning uchta asosiy xossasini tushuntira oladi',
      'Berilgan qadamlarni to‘g‘ri ketma-ketlikka joylashtira oladi',
    ],
    equipment: ['Proyektor', 'Qadam-kartochkalar to‘plami', 'Doska va markerlar'],
  },
}

/** Seed lessons are credited to the grade's class teacher, else the admin. */
export function seedAuthorFor(grade: number): { authorId: string; authorName: string } {
  const klass = CLASSES.find((c) => c.grade === grade)
  const teacher = klass && TEACHERS.find((t) => t.id === klass.teacherId)
  return teacher
    ? { authorId: teacher.id, authorName: teacher.name }
    : { authorId: USERS[0].id, authorName: USERS[0].name }
}

export function buildLessons(): Lesson[] {
  const lessons: Lesson[] = []
  for (const [gradeStr, quarters] of Object.entries(CURRICULUM)) {
    const grade = Number(gradeStr)
    quarters.forEach((titles, qi) => {
      titles.forEach((title, li) => {
        const quarter = qi + 1
        const order = li + 1
        const key = `${grade}-${quarter}-${order}`
        const rich = RICH[key]
        lessons.push({
          id: `l-${key}`,
          grade,
          quarter,
          order,
          title,
          ...seedAuthorFor(grade),
          objective: rich?.objective ?? objectiveFor(title, grade),
          theory: rich?.theory ?? theoryFor(title),
          practice: rich?.practice ?? practiceFor(title),
          homework: rich?.homework ?? homeworkFor(title),
          equipment: rich?.equipment ?? EQUIPMENT_BASE,
          outcomes: rich?.outcomes ?? outcomesFor(title),
          videoUrl: '',
          durationMin: 45,
          status: 'ready',
        })
      })
    })
  }
  return lessons
}

export function buildQuarterInfos(): QuarterInfo[] {
  const infos: QuarterInfo[] = []
  for (const [gradeStr, quarters] of Object.entries(CURRICULUM)) {
    const grade = Number(gradeStr)
    quarters.forEach((titles, qi) => {
      infos.push({
        grade,
        quarter: qi + 1,
        skills: titles.map((t) => `«${t}» mavzusi bo‘yicha bilim va amaliy ko‘nikma`),
      })
    })
  }
  return infos
}

// Journal seed: a few past lesson dates per class, each bound to a taught topic.
const JOURNAL_DATES = ['2026-05-12', '2026-05-19', '2026-05-26', '2026-06-02']

export function buildJournalColumns(classes: ClassGroup[]): JournalColumn[] {
  const columns: JournalColumn[] = []
  for (const klass of classes) {
    JOURNAL_DATES.forEach((date, i) => {
      // Late-spring dates fall into quarter 4 of the school year
      columns.push({
        id: `jc-${klass.id}-${date}`,
        classId: klass.id,
        date,
        lessonId: `l-${klass.grade}-4-${i + 1}`,
      })
    })
  }
  return columns
}

export function buildJournal(students: Student[]): JournalEntry[] {
  const entries: JournalEntry[] = []
  students.forEach((s, si) => {
    JOURNAL_DATES.forEach((date, di) => {
      const roll = (si * 7 + di * 11 + s.points) % 20
      const attendance = roll === 0 ? 'kelmadi' : roll === 1 ? 'kechikdi' : 'keldi'
      const grade = attendance === 'kelmadi' ? null : 3 + ((si + di + s.points) % 3)
      entries.push({
        id: `j-${s.id}-${date}`,
        studentId: s.id,
        classId: s.classId,
        date,
        grade,
        attendance,
      })
    })
  })
  return entries
}
