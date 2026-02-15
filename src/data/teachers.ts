export interface Teacher {
  id: number | string;
  name: string;
  subject: string;
  subjects: string[];
  location: string;
  rating: number;
  reviews: number;
  hourlyRate: number;
  experience: string;
  image: string;
  verified: boolean;
  online: boolean;
  inPerson: boolean;
  bio: string;
  totalStudents: number;
  responseTime: string;
  coordinates: { lat: number; lng: number };
}

// Ghana region coordinates (approximate centers)
export const ghanaRegionCoordinates: Record<string, { lat: number; lng: number }> = {
  "Greater Accra": { lat: 5.6037, lng: -0.1870 },
  "Ashanti": { lat: 6.6666, lng: -1.6163 },
  "Western": { lat: 5.0527, lng: -1.9823 },
  "Eastern": { lat: 6.1018, lng: -0.2616 },
  "Central": { lat: 5.1315, lng: -1.2795 },
  "Northern": { lat: 9.4034, lng: -0.8424 },
  "Volta": { lat: 6.6126, lng: 0.4703 },
  "Upper East": { lat: 10.7856, lng: -0.8615 },
  "Upper West": { lat: 10.2530, lng: -2.1410 },
  "Bono": { lat: 7.7310, lng: -2.0393 },
  "Bono East": { lat: 7.7500, lng: -1.0500 },
  "Ahafo": { lat: 7.0000, lng: -2.3500 },
  "Western North": { lat: 6.3000, lng: -2.4000 },
  "Oti": { lat: 7.9000, lng: 0.2000 },
  "North East": { lat: 10.5000, lng: -0.2000 },
  "Savannah": { lat: 8.8000, lng: -1.7500 },
};

export const ghanaRegions = [
  "All Regions",
  "Greater Accra",
  "Ashanti",
  "Western",
  "Eastern",
  "Central",
  "Northern",
  "Volta",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Western North",
  "Oti",
  "North East",
  "Savannah",
];

export const subjects = [
  "All Subjects",
  "Mathematics",
  "English Language",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "French",
  "History",
  "Geography",
  "Economics",
  "Accounting",
  "ICT",
  "Music",
  "Art",
  // New subjects added
  "Additional Mathematics",
  "Agricultural Science",
  "Agriculture",
  "Applied Technology",
  "Arabic",
  "Art and Design Foundation",
  "Arts and Design Studio",
  "Aviation and Aerospace Engineering",
  "Biomedical Science",
  "Business Management",
  "Clothing and Textiles",
  "Computing",
  "Design and Communication Technology",
  "Elective Physical Education and Health (PEH)",
  "Engineering",
  "Food and Nutrition",
  "General Science",
  "Ghanaian Language",
  "Government",
  "Information Communication Technology (ICT)",
  "Intervention English",
  "Intervention Mathematics",
  "Literature-in-English",
  "Management in Living",
  "Manufacturing Engineering",
  "Performing Arts",
  "Religious Studies (Christian)",
  "Religious Studies (Islamic)",
  "Religious and Moral Education",
  "Robotics",
  "Social Studies",
  "Spanish"
];

// Empty array - data comes from database
export const teachers: Teacher[] = [];
