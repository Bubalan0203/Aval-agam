export type TicketType = {
  id: string;
  name: string;
  price: number;
  available: number;
  sold: number;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  image: string;
  gallery: string[];
  status: "Available" | "Selling Fast" | "Sold Out";
  ticketTypes: TicketType[];
  category: string;
};

export type Booking = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  eventId: string;
  eventTitle: string;
  ticketType: string;
  quantity: number;
  amount: number;
  paymentStatus: "Paid" | "Pending" | "Refunded";
  bookingDate: string;
};

export const EVENTS: Event[] = [
  {
    id: "evt-001",
    title: "An Evening with the Author",
    description: "Join bestselling author Priya Sharma for an intimate conversation about her debut novel and the craft of writing.",
    fullDescription: "Spend an unforgettable evening with Priya Sharma, whose debut novel 'The Quiet Between' has taken the literary world by storm. In this intimate gathering, Priya will discuss her journey from aspiring writer to celebrated author, the inspirations behind her characters, and the craft of weaving personal truth into fiction. The evening includes a live reading, Q&A, and a book signing. Light refreshments will be served.",
    date: "2026-08-15",
    startTime: "6:30 PM",
    endTime: "9:00 PM",
    location: "The Literary Hall, Coimbatore",
    address: "12 Avinashi Road, Coimbatore, Tamil Nadu 641018",
    image: "https://images.unsplash.com/photo-1715610237622-748477adf2e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxhdXRob3IlMjB0YWxrJTIwc3RhZ2UlMjBtaWNyb3Bob25lJTIwYm9va3N8ZW58MXx8fHwxNzgzMDk5NDg3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
      "https://images.unsplash.com/photo-1725041957436-b12f76f910cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
      "https://images.unsplash.com/photo-1727044114132-4b680016b2da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    ],
    status: "Selling Fast",
    category: "Author Talk",
    ticketTypes: [
      { id: "t1", name: "General", price: 499, available: 80, sold: 65 },
      { id: "t2", name: "VIP (Front Row + Signed Copy)", price: 1299, available: 20, sold: 18 },
    ],
  },
  {
    id: "evt-002",
    title: "The Art of Storytelling Workshop",
    description: "A full-day workshop on narrative craft, character building, and finding your unique writing voice — for all skill levels.",
    fullDescription: "Whether you're writing your first short story or polishing a manuscript, this hands-on workshop will elevate your craft. Led by award-winning writing coach Arjun Nair, the day is structured around three pillars: story architecture, character depth, and voice. You'll leave with practical tools, written exercises, peer feedback, and a renewed excitement for the page. Includes printed workbook, lunch, and coffee breaks.",
    date: "2026-08-28",
    startTime: "9:00 AM",
    endTime: "5:00 PM",
    location: "Pages & Co. Studio, Coimbatore",
    address: "45 Race Course Road, Coimbatore, Tamil Nadu 641018",
    image: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxib29rJTIwcmVhZGluZyUyMGV2ZW50JTIwbGl0ZXJhcnklMjBmZXN0aXZhbCUyMGF1ZGllbmNlfGVufDF8fHx8MTc4MzA5OTQ4Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1659439267748-f3a7c74f02bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
      "https://images.unsplash.com/photo-1713845559621-3afad593349c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    ],
    status: "Available",
    category: "Workshop",
    ticketTypes: [
      { id: "t1", name: "Standard", price: 1999, available: 25, sold: 12 },
      { id: "t2", name: "Early Bird", price: 1499, available: 10, sold: 10 },
    ],
  },
  {
    id: "evt-003",
    title: "Mystery & Thriller Night",
    description: "An after-dark gathering for fans of crime fiction — panel discussions, author readings, and a live mystery game.",
    fullDescription: "As the sun sets, mystery descends. Join five of India's most gripping thriller writers for a night of suspense, intrigue, and revelation. The evening features back-to-back author readings of unpublished chapters, a panel debate on 'Who makes a better villain: the psychopath or the ordinary person pushed to the edge?', and a live Whodunnit game where the audience plays detective. A night you won't solve until the very end.",
    date: "2026-09-05",
    startTime: "7:00 PM",
    endTime: "10:30 PM",
    location: "The Dark Chapter Lounge, Coimbatore",
    address: "8 Brookefields Mall, Trichy Road, Coimbatore 641005",
    image: "https://images.unsplash.com/photo-1727044114132-4b680016b2da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxib29rJTIwcmVhZGluZyUyMGV2ZW50JTIwbGl0ZXJhcnklMjBmZXN0aXZhbCUyMGF1ZGllbmNlfGVufDF8fHx8MTc4MzA5OTQ4Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1611737833016-4c03cfb9faa0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    ],
    status: "Available",
    category: "Panel Event",
    ticketTypes: [
      { id: "t1", name: "General", price: 699, available: 60, sold: 28 },
      { id: "t2", name: "Premium (Lounge Seating)", price: 1199, available: 15, sold: 7 },
    ],
  },
  {
    id: "evt-004",
    title: "Poetry Slam Night",
    description: "An electric open-mic poetry competition celebrating Tamil and English verse — performers and audience welcome.",
    fullDescription: "Poetry Slam Night returns for its third season, and this time it's bigger than ever. Twenty-four performers take the stage in a high-energy spoken word competition judged by the audience itself. Tamil verse, English sonnets, bilingual free verse — all forms are celebrated. Sign up to perform or simply come to witness language at its most alive. The winning poet receives the Golden Quill trophy and a publishing opportunity with Kavitha Press.",
    date: "2026-09-20",
    startTime: "6:00 PM",
    endTime: "9:30 PM",
    location: "Nilgiris Cultural Centre, Coimbatore",
    address: "3 Nehru Street, RS Puram, Coimbatore 641002",
    image: "https://images.unsplash.com/photo-1635782013905-182c5dc10cae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxhdXRob3IlMjB0YWxrJTIwc3RhZ2UlMjBtaWNyb3Bob25lJTIwYm9va3N8ZW58MXx8fHwxNzgzMDk5NDg3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1715610237622-748477adf2e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
      "https://images.unsplash.com/photo-1659439267748-f3a7c74f02bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    ],
    status: "Sold Out",
    category: "Open Mic",
    ticketTypes: [
      { id: "t1", name: "Audience", price: 299, available: 100, sold: 100 },
      { id: "t2", name: "Performer + Audience", price: 0, available: 24, sold: 24 },
    ],
  },
  {
    id: "evt-005",
    title: "Children's Book Fair & Reading",
    description: "A joyful afternoon of storytelling, illustrations, and book discovery for young readers aged 4–14.",
    fullDescription: "Bring the little ones for a magical afternoon celebrating the joy of reading. Beloved children's authors will perform live readings, illustrators will host drawing workshops, and children can explore dozens of curated book stalls. Activities include a Bookmark Making Corner, a 'My Favourite Character' costume parade, and a read-aloud circle with storyteller Meena Krishnan. This is a free event — entry is a book donation.",
    date: "2026-10-04",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    location: "Coimbatore Public Library Grounds",
    address: "Town Hall Road, Coimbatore 641001",
    image: "https://images.unsplash.com/photo-1725041957436-b12f76f910cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib29rJTIwcmVhZGluZyUyMGV2ZW50JTIwbGl0ZXJhcnklMjBmZXN0aXZhbCUyMGF1ZGllbmNlfGVufDF8fHx8MTc4MzA5OTQ4Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1713845559621-3afad593349c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    ],
    status: "Available",
    category: "Family",
    ticketTypes: [
      { id: "t1", name: "Child (4–14)", price: 0, available: 200, sold: 87 },
      { id: "t2", name: "Adult Companion", price: 0, available: 200, sold: 87 },
    ],
  },
  {
    id: "evt-006",
    title: "The Reading Retreat Weekend",
    description: "A two-day countryside retreat for bibliophiles — curated reads, group discussions, and uninterrupted reading time.",
    fullDescription: "Escape the noise for a weekend designed entirely around books and the people who love them. Set in a serene farmhouse outside Coimbatore, the retreat includes a curated reading list shared a month in advance, two guided book discussion circles, solo reading time in hammocks and garden nooks, a candlelit author reading on Saturday evening, and a communal Sunday brunch conversation. All meals, accommodation, and reading materials included.",
    date: "2026-10-18",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    location: "Green Valley Farmhouse, Ooty Road",
    address: "Siruvani Hills Road, near Mettupalayam, Coimbatore 641301",
    image: "https://images.unsplash.com/photo-1713845559621-3afad593349c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxib29rJTIwcmVhZGluZyUyMGV2ZW50JTIwbGl0ZXJhcnklMjBmZXN0aXZhbCUyMGF1ZGllbmNlfGVufDF8fHx8MTc4MzA5OTQ4Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
      "https://images.unsplash.com/photo-1635782013905-182c5dc10cae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    ],
    status: "Selling Fast",
    category: "Retreat",
    ticketTypes: [
      { id: "t1", name: "Shared Room (2 nights)", price: 7999, available: 16, sold: 13 },
      { id: "t2", name: "Private Room (2 nights)", price: 12999, available: 4, sold: 4 },
    ],
  },
];

export const BOOKINGS: Booking[] = [
  { id: "BK-001", customerName: "Ananya Krishnan", email: "ananya@example.com", phone: "9876543210", eventId: "evt-001", eventTitle: "An Evening with the Author", ticketType: "General", quantity: 2, amount: 998, paymentStatus: "Paid", bookingDate: "2026-07-01" },
  { id: "BK-002", customerName: "Ravi Subramaniam", email: "ravi@example.com", phone: "9812345678", eventId: "evt-001", eventTitle: "An Evening with the Author", ticketType: "VIP (Front Row + Signed Copy)", quantity: 1, amount: 1299, paymentStatus: "Paid", bookingDate: "2026-07-01" },
  { id: "BK-003", customerName: "Meera Pillai", email: "meera@example.com", phone: "9900112233", eventId: "evt-002", eventTitle: "The Art of Storytelling Workshop", ticketType: "Standard", quantity: 1, amount: 1999, paymentStatus: "Paid", bookingDate: "2026-07-02" },
  { id: "BK-004", customerName: "Karthik Babu", email: "karthik@example.com", phone: "9988776655", eventId: "evt-002", eventTitle: "The Art of Storytelling Workshop", ticketType: "Early Bird", quantity: 2, amount: 2998, paymentStatus: "Paid", bookingDate: "2026-07-02" },
  { id: "BK-005", customerName: "Divya Lakshmi", email: "divya@example.com", phone: "9776655443", eventId: "evt-003", eventTitle: "Mystery & Thriller Night", ticketType: "General", quantity: 3, amount: 2097, paymentStatus: "Paid", bookingDate: "2026-07-03" },
  { id: "BK-006", customerName: "Sundar Raj", email: "sundar@example.com", phone: "9123456789", eventId: "evt-004", eventTitle: "Poetry Slam Night", ticketType: "Audience", quantity: 2, amount: 598, paymentStatus: "Paid", bookingDate: "2026-07-01" },
  { id: "BK-007", customerName: "Lakshmi Narayan", email: "lakshmi@example.com", phone: "9654321098", eventId: "evt-006", eventTitle: "The Reading Retreat Weekend", ticketType: "Shared Room (2 nights)", quantity: 1, amount: 7999, paymentStatus: "Paid", bookingDate: "2026-07-03" },
  { id: "BK-008", customerName: "Preethi Sharma", email: "preethi@example.com", phone: "9870987654", eventId: "evt-001", eventTitle: "An Evening with the Author", ticketType: "General", quantity: 1, amount: 499, paymentStatus: "Pending", bookingDate: "2026-07-03" },
];

export const MONTHLY_BOOKINGS = [
  { month: "Jan", bookings: 12 },
  { month: "Feb", bookings: 19 },
  { month: "Mar", bookings: 28 },
  { month: "Apr", bookings: 22 },
  { month: "May", bookings: 35 },
  { month: "Jun", bookings: 41 },
  { month: "Jul", bookings: 38 },
];

export const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 8400 },
  { month: "Feb", revenue: 14200 },
  { month: "Mar", revenue: 22800 },
  { month: "Apr", revenue: 17500 },
  { month: "May", revenue: 31200 },
  { month: "Jun", revenue: 38900 },
  { month: "Jul", revenue: 36100 },
];

export const TICKET_TYPE_DATA = [
  { name: "General", value: 156, color: "#C8734F" },
  { name: "VIP / Premium", value: 42, color: "#0F332B" },
  { name: "Workshop", value: 34, color: "#C9A25F" },
  { name: "Retreat", value: 17, color: "#EEE2D5" },
];
