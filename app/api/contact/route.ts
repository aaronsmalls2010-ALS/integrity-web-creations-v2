import { NextResponse } from 'next/server'
import { z } from 'zod'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  business: z.string().max(200).optional().or(z.literal('')),
  email: z.string().email().max(320),
  phone: z.string().max(40).optional().or(z.literal('')),
  service: z.string().max(80).optional().or(z.literal('')),
  message: z.string().min(1).max(5000),
  website: z.string().max(0).optional().or(z.literal('')), // honeypot — must be empty
})

export async function POST(req: Request) {
  let data: z.infer<typeof ContactSchema>
  try {
    data = ContactSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  // bots fill the honeypot — pretend success
  if (data.website) return NextResponse.json({ ok: true })

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return NextResponse.json({ error: 'unconfigured' }, { status: 500 })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 465),
      secure: Number(SMTP_PORT ?? 465) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
    await transporter.sendMail({
      from: `"IWC Website" <${SMTP_USER}>`,
      to: CONTACT_TO ?? SMTP_USER,
      replyTo: data.email,
      subject: `New inquiry from ${data.name}${data.business ? ` (${data.business})` : ''}`,
      text: [
        `Name: ${data.name}`,
        `Business: ${data.business || '—'}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone || '—'}`,
        `Service: ${data.service || '—'}`,
        '',
        data.message,
      ].join('\n'),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'send_failed' }, { status: 500 })
  }
}
