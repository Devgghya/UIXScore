
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ip = searchParams.get("ip");
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (!ip) {
            return NextResponse.json({ error: "Missing IP address" }, { status: 400 });
        }

        // Check for local IPs
        const privateIpPatterns = ['127.0.0.1', 'localhost', '::1', '192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'];
        const isPrivateIp = privateIpPatterns.some(pattern => ip.startsWith(pattern) || ip === pattern);

        if (isPrivateIp) {
            return NextResponse.json({
                error: true,
                message: "This is a local/private IP address and cannot be geolocated.",
                ip
            });
        }

        try {
            // Proxy the request to ip-api.com (HTTP)
            // Using fields to minimize data transfer
            const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,region,city,zip,lat,lon,isp,org,as,query,timezone,countryCode`);
            const data = await response.json();

            if (data.status === 'success') {
                return NextResponse.json({
                    ip: data.query,
                    city: data.city,
                    region: data.regionName,
                    region_code: data.region, // ip-api doesn't give region code directly in regionName, but 'region' field is usually the code
                    country: data.country,
                    country_name: data.country, // Mapping for frontend consistency
                    postal: data.zip,
                    latitude: data.lat,
                    longitude: data.lon,
                    org: data.org || data.isp,
                    asn: data.as,
                    timezone: data.timezone
                });
            } else {
                // Return error from provider
                return NextResponse.json({ error: true, message: data.message || "IP lookup failed", ip });
            }
        } catch (fetchError) {
            console.error("Upstream IP fetch error:", fetchError);
            return NextResponse.json({ error: true, message: "Failed to contact IP service", ip }, { status: 502 });
        }

    } catch (error) {
        console.error("IP Lookup API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
