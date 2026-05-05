process.env.JWT_SECRET ??= 'test-secret'
process.env.HKID_ENCRYPTION_KEY ??= Buffer.alloc(32, 1).toString('base64')
process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 3).toString('base64')
process.env.HKID_KEY_VERSION ??= 'v1'
process.env.BANK_KEY_VERSION ??= 'v1'
