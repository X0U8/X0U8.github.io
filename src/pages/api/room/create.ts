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

    // Check if room with this code already exists
    const existingRoom = await prisma.room.findUnique({
      where: { code },
    });

    if (existingRoom) {
      return res.status(400).json({ error: 'Room with this code already exists' });
    }

    // Create new room
    const room = await prisma.room.create({
      data: { code },
    });

    return res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ error: 'Failed to create room' });
  }
}