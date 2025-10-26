const Profile = require("../models/profile");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { parseBase64 } = require("../utils/parseBase64");
const axios = require("axios");

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:5001';

// Helper function để upload ảnh nếu là base64
async function uploadIfBase64(file, folder = "users/avatars") {
  if (!file) return null;
  if (typeof file !== "string") return file;

  // Nếu là base64 thì upload lên Cloudinary
  if (file.startsWith("data:")) {
    const { buffer, fakeFileName } = parseBase64(file);
    return await uploadToCloudinary(buffer, fakeFileName, folder);
  }

  // Nếu là link thì giữ nguyên
  return file;
}

// Tạo profile mới
async function createProfile(data) {
  // Upload avatar nếu là base64
  if (data.avatar) {
    data.avatar = await uploadIfBase64(data.avatar);
  }

  const profile = new Profile(data);
  return await profile.save();
}

// Lấy profile theo userId
async function getProfileByUserId(userId) {
  return await Profile.findOne({ userId });
}

// Cập nhật profile
async function updateProfile(userId, data) {
  // Upload avatar nếu là base64
  if (data.avatar) {
    data.avatar = await uploadIfBase64(data.avatar);
  }

  return await Profile.findOneAndUpdate({ userId }, data, { new: true });
}

// Đếm số user
async function getUserCount() {
  return await Profile.countDocuments();
}

// Lấy danh sách recent users
async function getRecentUsers(limit = 10) {
  const profiles = await Profile.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('userId firstName lastName avatar createdAt')
    .lean();

  // Lấy email từ auth-service cho từng user
  const usersWithEmail = await Promise.all(
    profiles.map(async (profile) => {
      try {
        const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/user/${profile.userId}`);
        const email = response.data?.email || '';
        
        return {
          name: `${profile.firstName} ${profile.lastName}`,
          email: email,
          avatar: profile.avatar || null,
          joinedDate: profile.createdAt
        };
      } catch (error) {
        console.error(`Error fetching email for user ${profile.userId}:`, error.message);
        return {
          name: `${profile.firstName} ${profile.lastName}`,
          email: '',
          avatar: profile.avatar || null,
          joinedDate: profile.createdAt
        };
      }
    })
  );

  return usersWithEmail;
}

// Lấy số users đăng ký theo tuần của mỗi tháng
async function getUsersByWeek(year, month) {
  // Tạo start date và end date của tháng
  const startDate = new Date(year, month - 1, 1); // Tháng bắt đầu từ 0
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Ngày cuối cùng của tháng

  // Lấy tất cả users trong tháng
  const users = await Profile.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).select('createdAt').lean();

  // Tính số tuần trong tháng (tối đa 5 tuần)
  const weeks = {
    week1: 0, // Ngày 1-7
    week2: 0, // Ngày 8-14
    week3: 0, // Ngày 15-21
    week4: 0, // Ngày 22-28
    week5: 0  // Ngày 29-31 (nếu có)
  };

  // Phân loại users theo tuần
  users.forEach(user => {
    const day = new Date(user.createdAt).getDate();
    
    if (day <= 7) {
      weeks.week1++;
    } else if (day <= 14) {
      weeks.week2++;
    } else if (day <= 21) {
      weeks.week3++;
    } else if (day <= 28) {
      weeks.week4++;
    } else {
      weeks.week5++;
    }
  });

  // Tạo response với format cho chart
  return {
    year,
    month,
    totalUsers: users.length,
    weeks: [
      { week: 'Week 1', users: weeks.week1, period: 'Day 1-7' },
      { week: 'Week 2', users: weeks.week2, period: 'Day 8-14' },
      { week: 'Week 3', users: weeks.week3, period: 'Day 15-21' },
      { week: 'Week 4', users: weeks.week4, period: 'Day 22-28' },
      { week: 'Week 5', users: weeks.week5, period: 'Day 29-31' }
    ]
  };
}

module.exports = {
  createProfile,
  getProfileByUserId,
  updateProfile,
  getUserCount,
  getRecentUsers,
  getUsersByWeek,
}
