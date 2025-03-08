import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Room code is required' });
    }

    const room = await prisma.room.findUnique({
      where: { code },
    });

    if (room) {
      return res.status(200).json({ exists: true, roomId: room.id });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking room:', error);
    return res.status(500).json({ error: 'Failed to check room' });
  }
}