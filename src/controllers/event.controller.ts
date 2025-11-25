import { Request, Response } from 'express';
import prisma from '../config/database';
import { eventSchema, eventRegistrationSchema } from '../utils/eventValidation';
import { getSocketIOInstance, emitNotification } from '../config/socket';

const createEventSchema = eventSchema;

export const createEvent = async (req: Request, res: Response) => {
  const body = createEventSchema.parse(req.body);

  const event = await prisma.event.create({
    data: {
      ...body,
      eventDate: new Date(body.eventDate),
    },
  });

  res.status(201).json({
    success: true,
    data: event,
  });
};

export const getEvent = async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          event: false,
        },
      },
      _count: {
        select: {
          registrations: true,
        },
      },
    },
  });

  if (!event) {
    res.status(404).json({
      success: false,
      message: 'Event not found',
    });
    return;
  }

  res.json({
    success: true,
    data: event,
  });
};

export const getAllEvents = async (req: Request, res: Response) => {
  const { organizerId, type, mode, isActive, upcoming, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (organizerId) where.organizerId = organizerId;
  if (type) where.type = type;
  if (mode) where.mode = mode;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (upcoming === 'true') {
    where.eventDate = { gte: new Date() };
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take,
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: { eventDate: 'asc' },
    }),
    prisma.event.count({ where }),
  ]);

  res.json({
    success: true,
    data: events,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const registerForEvent = async (req: Request, res: Response) => {
  const body = eventRegistrationSchema.parse(req.body);
  const { eventId, userId } = body;

  // Verify event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    res.status(404).json({
      success: false,
      message: 'Event not found',
    });
    return;
  }

  if (!event.isActive) {
    res.status(400).json({
      success: false,
      message: 'Event is not active',
    });
    return;
  }

  if (event.maxAttendees && event.registeredCount >= event.maxAttendees) {
    res.status(400).json({
      success: false,
      message: 'Event is full',
    });
    return;
  }

  // Check if already registered
  const existingRegistration = await prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
  });

  if (existingRegistration) {
    res.status(409).json({
      success: false,
      message: 'Already registered for this event',
    });
    return;
  }

  // Create registration and update count
  const [registration] = await Promise.all([
    prisma.eventRegistration.create({
      data: {
        eventId,
        userId,
      },
      include: {
        event: true,
      },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: {
        registeredCount: { increment: 1 },
      },
    }),
  ]);

  // Send notification to user about successful registration
  const io = getSocketIOInstance();
  if (io) {
    const eventDateFormatted = new Date(event.eventDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await emitNotification(io, userId, {
      type: 'EVENT_REGISTRATION',
      title: 'Event Registration Successful! 🎉',
      message: `You have successfully registered for "${event.title}". Event date: ${eventDateFormatted}`,
      data: {
        registrationId: registration.id,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.eventDate,
      },
    });
    console.log(`📬 Socket.io: Event registration notification sent to user ${userId}`);
  }

  res.status(201).json({
    success: true,
    data: registration,
  });
};

export const updateEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = createEventSchema.parse(req.body);

  // Check if event exists
  const existingEvent = await prisma.event.findUnique({
    where: { id },
  });

  if (!existingEvent) {
    res.status(404).json({
      success: false,
      message: 'Event not found',
    });
    return;
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...body,
      eventDate: new Date(body.eventDate),
    },
  });

  res.json({
    success: true,
    data: event,
  });
};

export const deleteEvent = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if event has registrations
  const registrationsCount = await prisma.eventRegistration.count({
    where: { eventId: id },
  });

  if (registrationsCount > 0) {
    res.status(400).json({
      success: false,
      message: `Cannot delete event. It has ${registrationsCount} registration(s).`,
    });
    return;
  }

  await prisma.event.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Event deleted successfully',
  });
};

export const getEventRegistrations = async (req: Request, res: Response) => {
  const { eventId, userId, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (eventId) where.eventId = eventId;
  if (userId) where.userId = userId;

  const [registrations, total] = await Promise.all([
    prisma.eventRegistration.findMany({
      where,
      skip,
      take,
      include: {
        event: true,
      },
      orderBy: { registeredAt: 'desc' },
    }),
    prisma.eventRegistration.count({ where }),
  ]);

  // Fetch user details for each registration
  const registrationsWithUsers = await Promise.all(
    registrations.map(async (reg) => {
      const individual = await prisma.individualKYC.findUnique({
        where: { userId: reg.userId },
        select: {
          userId: true,
          fullName: true,
          email: true,
        },
      });
      return {
        ...reg,
        individual: individual || null,
      };
    })
  );

  res.json({
    success: true,
    data: registrationsWithUsers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

