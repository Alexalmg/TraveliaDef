import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configurar el transporter de nodemailer para SendGrid
const transporter = nodemailer.createTransport({
  host: process.env.SENDGRID_SMTP_SERVER, // Servidor SMTP de SendGrid
  port: parseInt(process.env.SENDGRID_SMTP_PORT || '587', 10), // Puerto de SendGrid
  secure: false, // SendGrid usa TLS en el puerto 587
  auth: {
    user: 'apikey', // Usuario fijo para API Key en SendGrid
    pass: process.env.SENDGRID_API_KEY // Tu clave API de SendGrid
  }
});

export async function POST(request: Request) {
  try {
    const { email, route, destination, origin } = await request.json();

    // Crear el contenido del correo
    const routeInfo = route.routes[0].legs[0];
    const distance = routeInfo.distance.text;
    const duration = routeInfo.duration.text;
    const steps = routeInfo.steps.map((step: any, index: number) => 
      `${index + 1}. ${step.distance.text} - ${step.duration.text}\n   ${step.html_instructions.replace(/<[^>]*>/g, '')}`
    ).join('\n\n');

    const mailOptions = {
      from: process.env.EMAIL_FROM_ADDRESS, // Usa la dirección verificada en SendGrid
      to: email,
      subject: `Ruta de ${origin} a ${destination}`,
      text: `
Ruta de ${origin} a ${destination}

Distancia total: ${distance}
Duración estimada: ${duration}

Instrucciones de la ruta:
${steps}

Esta ruta ha sido generada por Travelia.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Ruta de ${origin} a ${destination}</h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Distancia total:</strong> ${distance}</p>
            <p><strong>Duración estimada:</strong> ${duration}</p>
          </div>

          <h3 style="color: #1e40af;">Instrucciones de la ruta:</h3>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px;">
            ${routeInfo.steps.map((step: any, index: number) => `
              <div style="margin-bottom: 15px;">
                <p style="color: #4b5563; margin: 0;">
                  <strong>${index + 1}.</strong> ${step.distance.text} - ${step.duration.text}
                </p>
                <p style="color: #6b7280; margin: 5px 0 0 20px;">
                  ${step.html_instructions.replace(/<[^>]*>/g, '')}
                </p>
              </div>
            `).join('')}
          </div>

          <p style="color: #6b7280; font-size: 0.875rem; margin-top: 20px;">
            Esta ruta ha sido generada por Travelia.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Correo enviado correctamente' });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    return NextResponse.json(
      { error: 'Error al enviar el correo' },
      { status: 500 }
    );
  }
} 