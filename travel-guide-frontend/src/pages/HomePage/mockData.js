// Mock data cho các ký ức du lịch với thông tin chi tiết
export const mockMemories = [
  {
    id: 1,
    title: 'Chuyến đi Đà Lạt mùa hoa mai anh đào',
    location: 'Đà Lạt, Lâm Đồng',
    coordinates: { lat: 11.9404, lng: 108.4583, top: '25%', left: '30%' },
    date: '2024-02-15',
    time: '14:30',
    images: [
      'https://images.unsplash.com/photo-1645387326447-7f7ea34f0162?w=800&q=80',
      'https://images.unsplash.com/photo-1627353801782-c5f1ae64be9e?w=800&q=80'
    ],
    status: 'private', // 'public' hoặc 'private'
    description: 'Một chuyến đi tuyệt vời với những cánh đồng hoa mai anh đào nở rộ. Không khí trong lành và cảnh đẹp như tranh vẽ.',
    mood: 'Hạnh phúc',
    weather: 'Nắng đẹp, 22°C',
    category: 'travel'
  },
  {
    id: 2,
    title: 'Bữa tối tại nhà hàng Phố Cổ',
    location: 'Hà Nội',
    coordinates: { lat: 21.0285, lng: 105.8542, top: '35%', left: '50%' },
    date: '2024-01-20',
    time: '19:00',
    images: [
      'https://images.unsplash.com/photo-1565893089337-4680bbb1f34e?w=800&q=80'
    ],
    status: 'public',
    description: 'Trải nghiệm ẩm thực Hà Nội với những món ăn truyền thống đậm đà hương vị.',
    mood: 'Thư giãn',
    weather: 'Mát mẻ, 18°C',
    category: 'food'
  },
  {
    id: 3,
    title: 'Hoàng hôn trên biển Đà Nẵng',
    location: 'Đà Nẵng',
    coordinates: { lat: 16.0544, lng: 108.2022, top: '45%', left: '40%' },
    date: '2024-03-10',
    time: '18:15',
    images: [
      'https://images.unsplash.com/photo-1627353801782-c5f1ae64be9e?w=800&q=80',
      'https://images.unsplash.com/photo-1645387326447-7f7ea34f0162?w=800&q=80'
    ],
    status: 'public',
    description: 'Khoảnh khắc hoàng hôn tuyệt đẹp với bầu trời đầy màu sắc và sóng biển êm đềm.',
    mood: 'Lãng mạn',
    weather: 'Nắng, 28°C',
    category: 'nature'
  },
  {
    id: 4,
    title: 'Khám phá đảo Phú Quốc',
    location: 'Phú Quốc, Kiên Giang',
    coordinates: { lat: 10.2899, lng: 103.9840, top: '60%', left: '35%' },
    date: '2024-04-05',
    time: '10:00',
    images: [
      'https://images.unsplash.com/photo-1672855134530-636c3fe6476a?w=800&q=80',
      'https://images.unsplash.com/photo-1645387326447-7f7ea34f0162?w=800&q=80'
    ],
    status: 'public',
    description: 'Những bãi biển tuyệt đẹp với nước trong xanh và cát trắng mịn. Thiên đường nghỉ dưỡng.',
    mood: 'Phấn khích',
    weather: 'Nắng nóng, 32°C',
    category: 'travel'
  },
  {
    id: 5,
    title: 'Cà phê sáng tại Sapa',
    location: 'Sapa, Lào Cai',
    coordinates: { lat: 22.3364, lng: 103.8443, top: '20%', left: '45%' },
    date: '2024-02-18',
    time: '07:30',
    images: [
      'https://images.unsplash.com/photo-1565893089337-4680bbb1f34e?w=800&q=80'
    ],
    status: 'private',
    description: 'Thưởng thức cà phê trong không khí lạnh se se của vùng núi, nhìn ra những thửa ruộng bậc thang.',
    mood: 'Bình yên',
    weather: 'Lạnh, 12°C',
    category: 'food'
  },
  {
    id: 6,
    title: 'Thác nước trong rừng',
    location: 'Đà Lạt, Lâm Đồng',
    coordinates: { lat: 11.9500, lng: 108.4500, top: '28%', left: '32%' },
    date: '2024-02-22',
    time: '13:00',
    images: [
      'https://images.unsplash.com/photo-1627353801782-c5f1ae64be9e?w=800&q=80'
    ],
    status: 'public',
    description: 'Khám phá thác nước ẩn mình trong rừng thông, không khí trong lành và tiếng nước chảy êm đềm.',
    mood: 'Tươi mới',
    weather: 'Mát, 20°C',
    category: 'nature'
  },
  {
    id: 7,
    title: 'Lễ hội hoa tại Đà Lạt',
    location: 'Đà Lạt, Lâm Đồng',
    coordinates: { lat: 11.9400, lng: 108.4600, top: '26%', left: '31%' },
    date: '2024-02-28',
    time: '15:00',
    images: [
      'https://images.unsplash.com/photo-1645387326447-7f7ea34f0162?w=800&q=80'
    ],
    status: 'public',
    description: 'Tham gia lễ hội hoa với hàng ngàn loài hoa đủ màu sắc, không gian rực rỡ và đầy sắc màu.',
    mood: 'Vui vẻ',
    weather: 'Nắng nhẹ, 23°C',
    category: 'travel'
  },
  {
    id: 8,
    title: 'Bún bò Huế đặc biệt',
    location: 'Huế',
    coordinates: { lat: 16.4637, lng: 107.5909, top: '50%', left: '42%' },
    date: '2024-03-12',
    time: '12:00',
    images: [
      'https://images.unsplash.com/photo-1565893089337-4680bbb1f34e?w=800&q=80'
    ],
    status: 'public',
    description: 'Thưởng thức bún bò Huế chính hiệu với hương vị đậm đà, cay nồng đặc trưng.',
    mood: 'Hài lòng',
    weather: 'Nắng, 26°C',
    category: 'food'
  }
];

// Mock data cho các địa điểm được người khác chia sẻ
export const mockSharedMemories = [
  {
    id: 101,
    title: 'Cầu Vàng Đà Nẵng - Điểm check-in nổi tiếng',
    location: 'Đà Nẵng',
    coordinates: { lat: 16.0800, lng: 108.2200, top: '48%', left: '38%' },
    date: '2024-03-15',
    time: '16:00',
    images: [
      'https://images.unsplash.com/photo-1627353801782-c5f1ae64be9e?w=800&q=80',
      'https://images.unsplash.com/photo-1645387326447-7f7ea34f0162?w=800&q=80'
    ],
    status: 'shared',
    description: 'Cầu Vàng với kiến trúc độc đáo, tay cầu được thiết kế như bàn tay khổng lồ nâng đỡ. Một điểm đến không thể bỏ qua khi đến Đà Nẵng.',
    mood: 'Ngạc nhiên',
    weather: 'Nắng đẹp, 27°C',
    category: 'travel',
    isShared: true,
    sharedBy: 'Nguyễn Văn A',
    sharedByAvatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=06b6d4&color=fff'
  },
  {
    id: 102,
    title: 'Chợ đêm Hội An - Ẩm thực đường phố',
    location: 'Hội An, Quảng Nam',
    coordinates: { lat: 15.8801, lng: 108.3380, top: '52%', left: '41%' },
    date: '2024-03-20',
    time: '19:30',
    images: [
      'https://images.unsplash.com/photo-1565893089337-4680bbb1f34e?w=800&q=80'
    ],
    status: 'shared',
    description: 'Chợ đêm Hội An với không gian ẩm thực đa dạng, từ cao lầu đến bánh mì Phượng. Không khí sôi động và đầy màu sắc.',
    mood: 'Thích thú',
    weather: 'Mát mẻ, 25°C',
    category: 'food',
    isShared: true,
    sharedBy: 'Trần Thị B',
    sharedByAvatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=0891b2&color=fff'
  },
  {
    id: 103,
    title: 'Bãi biển Mỹ Khê - Hoàng hôn tuyệt đẹp',
    location: 'Đà Nẵng',
    coordinates: { lat: 16.0583, lng: 108.2278, top: '46%', left: '39%' },
    date: '2024-04-01',
    time: '17:45',
    images: [
      'https://images.unsplash.com/photo-1672855134530-636c3fe6476a?w=800&q=80',
      'https://images.unsplash.com/photo-1645387326447-7f7ea34f0162?w=800&q=80'
    ],
    status: 'shared',
    description: 'Bãi biển Mỹ Khê với cát trắng mịn và nước biển trong xanh. Hoàng hôn ở đây thật sự là một kiệt tác của thiên nhiên.',
    mood: 'Lãng mạn',
    weather: 'Nắng, 29°C',
    category: 'nature',
    isShared: true,
    sharedBy: 'Lê Văn C',
    sharedByAvatar: 'https://ui-avatars.com/api/?name=Le+Van+C&background=22d3ee&color=fff'
  },
  {
    id: 104,
    title: 'Nhà thờ Đức Bà Sài Gòn',
    location: 'Thành phố Hồ Chí Minh',
    coordinates: { lat: 10.7797, lng: 106.6990, top: '65%', left: '45%' },
    date: '2024-01-10',
    time: '10:00',
    images: [
      'https://images.unsplash.com/photo-1627353801782-c5f1ae64be9e?w=800&q=80'
    ],
    status: 'shared',
    description: 'Nhà thờ Đức Bà với kiến trúc Pháp cổ điển, một biểu tượng của Sài Gòn. Xung quanh có nhiều điểm tham quan thú vị.',
    mood: 'Trầm ngâm',
    weather: 'Nắng nóng, 32°C',
    category: 'travel',
    isShared: true,
    sharedBy: 'Phạm Thị D',
    sharedByAvatar: 'https://ui-avatars.com/api/?name=Pham+Thi+D&background=67e8f9&color=fff'
  },
  {
    id: 105,
    title: 'Phở Bắc - Quán phở nổi tiếng Hà Nội',
    location: 'Hà Nội',
    coordinates: { lat: 21.0300, lng: 105.8500, top: '33%', left: '51%' },
    date: '2024-02-05',
    time: '08:00',
    images: [
      'https://images.unsplash.com/photo-1565893089337-4680bbb1f34e?w=800&q=80'
    ],
    status: 'shared',
    description: 'Quán phở Bắc với nước dùng đậm đà, thịt bò tái chín vừa. Một trong những quán phở ngon nhất Hà Nội theo đánh giá của nhiều người.',
    mood: 'Hài lòng',
    weather: 'Lạnh, 15°C',
    category: 'food',
    isShared: true,
    sharedBy: 'Hoàng Văn E',
    sharedByAvatar: 'https://ui-avatars.com/api/?name=Hoang+Van+E&background=0e7490&color=fff'
  }
];

export const mockStats = {
  totalLocations: 8,
  totalMemories: 12,
  publicMemories: 6,
  privateMemories: 6,
  countriesVisited: 1,
  yearsTracked: 1
};




