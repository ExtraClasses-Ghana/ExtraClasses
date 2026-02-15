import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import { Star, BadgeCheck, MapPin } from "lucide-react";
import { Teacher, ghanaRegionCoordinates } from "@/data/teachers";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface TeacherMapProps {
  teachers: Teacher[];
  selectedRegion: string;
  onTeacherSelect?: (teacher: Teacher) => void;
}

export function TeacherMap({ teachers, selectedRegion, onTeacherSelect }: TeacherMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Default to Ghana center
  const defaultCenter: [number, number] = [7.9465, -1.0232];
  const defaultZoom = 7;

  // Calculate center based on selected region or teachers
  const getMapCenter = (): [number, number] => {
    if (selectedRegion && selectedRegion !== "All Regions") {
      const regionCoords = ghanaRegionCoordinates[selectedRegion];
      if (regionCoords) {
        return [regionCoords.lat, regionCoords.lng];
      }
    }
    if (teachers.length > 0) {
      const avgLat = teachers.reduce((sum, t) => sum + t.coordinates.lat, 0) / teachers.length;
      const avgLng = teachers.reduce((sum, t) => sum + t.coordinates.lng, 0) / teachers.length;
      return [avgLat, avgLng];
    }
    return defaultCenter;
  };

  const getZoom = () => {
    if (selectedRegion && selectedRegion !== "All Regions") {
      return 10;
    }
    return defaultZoom;
  };

  // Create custom icon
  const createCustomIcon = (verified: boolean) =>
    L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${verified ? "#4FD1C7" : "#FF7E5D"};
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg style="width: 20px; height: 20px; color: white;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current).setView(getMapCenter(), getZoom());

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when teachers change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    teachers.forEach((teacher) => {
      const marker = L.marker([teacher.coordinates.lat, teacher.coordinates.lng], {
        icon: createCustomIcon(teacher.verified),
      });

      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <div style="display: flex; align-items: start; gap: 12px;">
            <img 
              src="${teacher.image}" 
              alt="${teacher.name}"
              style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;"
            />
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <strong style="font-size: 14px;">${teacher.name}</strong>
                ${teacher.verified ? '<span style="color: #4FD1C7;">✓</span>' : ""}
              </div>
              <p style="font-size: 12px; color: #666; margin: 2px 0;">${teacher.subject}</p>
              <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                <span style="color: #ECC94B;">★</span>
                <span style="font-size: 12px; font-weight: 500;">${teacher.rating}</span>
                <span style="font-size: 12px; color: #888;">(${teacher.reviews})</span>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
            <span style="font-weight: 700; color: #FF7E5D;">GH₵${teacher.hourlyRate}/hr</span>
            <a 
              href="/teacher/${teacher.id}" 
              style="
                background: #FF7E5D;
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 500;
                text-decoration: none;
              "
            >
              View Profile
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", () => {
        setSelectedTeacher(teacher);
        onTeacherSelect?.(teacher);
      });

      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });
  }, [teachers, onTeacherSelect]);

  // Update map view when region changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(getMapCenter(), getZoom());
  }, [selectedRegion, teachers]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg relative">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: "400px" }} />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 z-[1000]">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-accent" />
            <span>Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-secondary" />
            <span>Standard</span>
          </div>
        </div>
      </div>

      {/* Teacher count */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md px-3 py-2 z-[1000]">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-secondary" />
          <span className="font-medium">{teachers.length} teachers</span>
        </div>
      </div>
    </div>
  );
}
