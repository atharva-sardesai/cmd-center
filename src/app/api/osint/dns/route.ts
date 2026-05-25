// DEMO MOCK — RECON tools disabled in demo mode.
import { NextResponse } from 'next/server';
const disabled = () => NextResponse.json({ error: "RECON tools are disabled in demo mode." }, { status: 503 });
export { disabled as GET, disabled as POST };
