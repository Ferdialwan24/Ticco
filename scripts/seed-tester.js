const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Load environment variables from .env.local if present
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function seedTesterAccount() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticco';
  console.log(`Connecting to MongoDB at: ${uri}...`);

  await mongoose.connect(uri);

  const UserSchema = new mongoose.Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
      password: { type: String },
      name: { type: String, required: true, trim: true },
      avatarUrl: { type: String, default: '' },
    },
    { timestamps: true }
  );

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const email = 'ferdialwan@ticco.com';
  const username = 'ferdialwan';
  const rawPassword = 'ferdialwan';
  const name = 'Ferdi Alwan';

  const hashedPassword = hashPassword(rawPassword);

  let user = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (user) {
    user.email = email.toLowerCase();
    user.username = username.toLowerCase();
    user.password = hashedPassword;
    user.name = name;
    await user.save();
    console.log(`[SUCCESS] Akun tester berhasil diperbarui di database! ID: ${user._id}`);
  } else {
    user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      name: name,
      avatarUrl: '',
    });
    console.log(`[SUCCESS] Akun tester baru berhasil dibuat & dipush ke database! ID: ${user._id}`);
  }

  await mongoose.disconnect();
  console.log('MongoDB connection closed.');
}

seedTesterAccount().catch((err) => {
  console.error('[ERROR] Gagal melakukan push akun tester ke database:', err);
  process.exit(1);
});
