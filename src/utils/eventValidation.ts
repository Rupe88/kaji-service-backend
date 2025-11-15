import { z } from 'zod';
import { uuidSchema } from './validation';

export const eventSchema = z.object({
  organizerId: uuidSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters'),
  type: z.enum(['WEBINAR', 'SEMINAR', 'WORKSHOP', 'VIRTUAL_CONFERENCE'], {
    errorMap: () => ({ message: 'Invalid event type' }),
  }),
  mode: z.enum(['PHYSICAL', 'ONLINE', 'HYBRID'], {
    errorMap: () => ({ message: 'Invalid event mode' }),
  }),
  isFree: z.boolean().default(true),
  price: z.number().min(0, 'Price cannot be negative').max(100000, 'Price too high').optional(),
  eventDate: z.string().datetime('Invalid date format').refine(
    (date) => new Date(date) >= new Date(),
    { message: 'Event date must be in the future' }
  ),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 1440 minutes (24 hours)'),
  meetingLink: z.string().url('Invalid URL format').optional(),
  venue: z.string().max(500, 'Venue must be less than 500 characters').optional(),
  maxAttendees: z.number().int().min(1, 'Max attendees must be at least 1').max(100000, 'Max attendees cannot exceed 100000').optional(),
}).refine(
  (data) => {
    if (data.mode === 'ONLINE' && !data.meetingLink) {
      return false;
    }
    if (data.mode === 'PHYSICAL' && !data.venue) {
      return false;
    }
    return true;
  },
  {
    message: 'Meeting link is required for online events, venue is required for physical events',
  }
);

export const eventRegistrationSchema = z.object({
  eventId: uuidSchema,
  userId: uuidSchema,
});

