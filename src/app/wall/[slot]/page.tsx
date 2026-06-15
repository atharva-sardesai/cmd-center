import { notFound } from 'next/navigation';
import { WallSlotSurface } from '@/components/wall/WallSlotSurface';
import { isWallSlot } from '@/server/wallState';

export default async function WallSlotPage({
  params,
}: {
  params: Promise<{ slot: string }>;
}) {
  const { slot } = await params;

  if (!isWallSlot(slot)) {
    notFound();
  }

  return <WallSlotSurface slot={slot} />;
}
