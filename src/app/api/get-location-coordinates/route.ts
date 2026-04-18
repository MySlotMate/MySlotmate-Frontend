import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locationName = searchParams.get("q");

  if (!locationName) {
    return NextResponse.json(
      { error: "Location name is required" },
      { status: 400 }
    );
  }

  try {
    // Call Nominatim API from server (no CORS issues)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "MySlotmate-App/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Location not found", fallback: true },
        { status: 404 }
      );
    }

    const location = data[0];
    
    // Validate the response has required fields
    if (
      typeof location !== "object" ||
      location === null ||
      !("lat" in location) ||
      !("lon" in location) ||
      !("display_name" in location)
    ) {
      throw new Error("Invalid location data structure");
    }

    const { lat, lon, display_name } = location as {
      lat: string;
      lon: string;
      display_name: string;
    };

    return NextResponse.json({
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      display_name,
      mapsUrl: `https://www.google.com/maps/place/@${lat},${lon},18z`,
    });
  } catch (error) {
    console.error("Location lookup error:", error);
    return NextResponse.json(
      { error: "Failed to fetch location", fallback: true },
      { status: 500 }
    );
  }
}
