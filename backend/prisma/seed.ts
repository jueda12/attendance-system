import argon2 from 'argon2'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const toUtcDate = (date: string) => new Date(`${date}T00:00:00.000Z`)

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
    { key: 'mpf_monthly_min', value: '7100', valueType: 'decimal', category: 'mpf', label: 'MPF 月入下限' },
    { key: 'mpf_monthly_max', value: '30000', valueType: 'decimal', category: 'mpf', label: 'MPF 月入上限' },
    { key: 'mpf_contribution_rate', value: '0.05', valueType: 'decimal', category: 'mpf', label: 'MPF 供款比率' },
    { key: 'casual_threshold_days', value: '60', valueType: 'integer', category: 'mpf', label: '臨時僱員轉一般僱員天數' },
    { key: 'typhoon_policy', value: 'full_day_pay', valueType: 'string', category: 'policy', label: '颱風日薪酬政策' },
    { key: 'rainstorm_policy', value: 'full_day_pay', valueType: 'string', category: 'policy', label: '黑色暴雨薪酬政策' },
    { key: 'restday_pay_policy', value: 'unpaid', valueType: 'string', category: 'policy', label: '休息日薪酬政策' },
    { key: 'holiday_min_months', value: '3', valueType: 'integer', category: 'policy', label: '法定假日薪酬所需最少受僱月數' },
    { key: 'winter_holiday_choice', value: 'christmas', valueType: 'string', category: 'policy', label: '冬節/聖誕節法定假日二擇一' },
    { key: 'backdated_entry_allowed', value: 'true', valueType: 'boolean', category: 'policy', label: '是否允許補錄歷史出勤' },
    { key: 'rehire_continuity_days', value: '180', valueType: 'integer', category: 'policy', label: '離職重聘視為延續的最長日數' },
    { key: 'company_name_zh', value: '', valueType: 'string', category: 'company', label: '公司名稱（中）' },
    { key: 'company_name_en', value: '', valueType: 'string', category: 'company', label: 'Company Name' },
    { key: 'company_logo_url', value: '', valueType: 'string', category: 'company', label: '公司 Logo URL' },
    { key: 'jwt_expiry_hours', value: '8', valueType: 'integer', category: 'system', label: 'JWT token 有效期' },
    { key: 'backup_retention_days', value: '30', valueType: 'integer', category: 'system', label: '備份保留天數' }
  ]

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: config,
      create: config
    })
  }

  const winterHolidayChoiceConfig = await prisma.systemConfig.findUnique({
    where: { key: 'winter_holiday_choice' },
    select: { value: true }
  })

  const winterHolidayChoice =
    winterHolidayChoiceConfig?.value === 'winter_solstice' ? 'winter_solstice' : 'christmas'
  const winterHoliday =
    winterHolidayChoice === 'winter_solstice'
      ? (['2026-12-22', '冬節'] as const)
      : (['2026-12-25', '聖誕節'] as const)

  const publicHolidays2026 = [
    ['2026-01-01', '一月一日'],
    ['2026-02-17', '農曆年初一'],
    ['2026-02-18', '農曆年初二'],
    ['2026-02-19', '農曆年初三'],
    ['2026-04-05', '清明節'],
    ['2026-04-06', '復活節星期一'],
    ['2026-05-01', '勞動節'],
    ['2026-05-24', '佛誕'],
    ['2026-06-19', '端午節'],
    ['2026-07-01', '香港特別行政區成立紀念日'],
    ['2026-09-26', '中秋節翌日'],
    ['2026-10-01', '國慶日'],
    ['2026-10-18', '重陽節'],
    winterHoliday,
    ['2026-12-26', '聖誕節後第一個周日']
  ] as const

  for (const [effectiveDate, hourlyRate] of [
    ['2025-05-01', '42.10'],
    ['2026-05-01', '43.10']
  ] as const) {
    await prisma.minWageHistory.upsert({
      where: { effectiveDate: toUtcDate(effectiveDate) },
      update: { hourlyRate },
      create: { effectiveDate: toUtcDate(effectiveDate), hourlyRate }
    })
  }

  await prisma.publicHoliday.deleteMany({
    where: {
      isStatutory: true,
      date: {
        gte: toUtcDate('2026-01-01'),
        lt: toUtcDate('2027-01-01')
      }
    }
  })

  for (const [date, nameZh] of publicHolidays2026) {
    await prisma.publicHoliday.upsert({
      where: { date: toUtcDate(date) },
      update: { nameZh },
      create: { date: toUtcDate(date), nameZh, isStatutory: true }
    })
  }

  console.log('Admin temp password: TempPass123! (must change on first login)')
}

main()
  .catch((error) => {
    throw error
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
