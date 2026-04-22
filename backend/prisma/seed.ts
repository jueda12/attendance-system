import argon2 from 'argon2'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const publicHolidays2026 = [
  ['2026-01-01', '一月一日'],
  ['2026-02-17', '農曆年初一'],
  ['2026-02-18', '農曆年初二'],
  ['2026-02-19', '農曆年初三'],
  ['2026-04-03', '耶穌受難節'],
  ['2026-04-04', '耶穌受難節翌日'],
  ['2026-04-06', '復活節星期一'],
  ['2026-04-07', '清明節翌日'],
  ['2026-05-01', '勞動節'],
  ['2026-05-25', '佛誕'],
  ['2026-06-19', '端午節'],
  ['2026-07-01', '香港特別行政區成立紀念日'],
  ['2026-09-26', '中秋節翌日'],
  ['2026-10-01', '國慶日'],
  ['2026-10-19', '重陽節翌日'],
  ['2026-12-25', '聖誕節'],
  ['2026-12-26', '聖誕節後第一個周日']
] as const

async function main() {
  const passwordHash = await argon2.hash('TempPass123!', {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  })

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      nameZh: '系統管理員',
      role: 'admin',
      passwordHash,
      mustChangePwd: true
    }
  })

  const systemConfigs = [
    { key: 'min_wage_hourly', value: '42.10', valueType: 'decimal', category: 'wage', label: '最低工資（時薪）' },
    { key: 'mpf_monthly_min', value: '7100', valueType: 'decimal', category: 'mpf', label: 'MPF 月入下限' },
    { key: 'mpf_monthly_max', value: '30000', valueType: 'decimal', category: 'mpf', label: 'MPF 月入上限' },
    { key: 'typhoon_policy', value: 'full_day_pay', valueType: 'string', category: 'policy', label: '颱風日薪酬政策' }
  ]

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: config,
      create: config
    })
  }

  await prisma.minWageHistory.upsert({
    where: { effectiveDate: new Date('2025-05-01T00:00:00.000Z') },
    update: { hourlyRate: '42.10' },
    create: { effectiveDate: new Date('2025-05-01T00:00:00.000Z'), hourlyRate: '42.10' }
  })

  for (const [date, nameZh] of publicHolidays2026) {
    await prisma.publicHoliday.upsert({
      where: { date: new Date(`${date}T00:00:00.000Z`) },
      update: { nameZh },
      create: { date: new Date(`${date}T00:00:00.000Z`), nameZh, isStatutory: true }
    })
  }
}

main()
  .catch((error) => {
    throw error
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
