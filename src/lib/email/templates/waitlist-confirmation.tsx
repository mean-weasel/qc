import { Html, Head, Body, Container, Text, Button, Link, Section } from '@react-email/components'

interface WaitlistConfirmationEmailProps {
  name?: string
  unsubscribeUrl?: string
}

export function WaitlistConfirmationEmail({
  name,
  unsubscribeUrl,
}: WaitlistConfirmationEmailProps): React.ReactElement {
  const greeting = name ? `Hey ${name},` : 'Hey there,'

  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>You're on the QC waitlist!</Text>
          <Text style={paragraph}>{greeting}</Text>
          <Text style={paragraph}>
            Thanks for your interest in QC! We're currently in private beta, letting people in gradually. We'll email
            you as soon as your spot is ready.
          </Text>
          <Text style={paragraph}>
            In the meantime, know that QC is being built to help couples strengthen their connection through regular
            check-ins, shared notes, and celebrating milestones together.
          </Text>
          <Section style={buttonSection}>
            <Button style={button} href="https://qualitycouple.com">
              Visit QC
            </Button>
          </Section>
          <Text style={footerLinks}>
            <Link href="https://tryqc.co/privacy" style={link}>
              Privacy Policy
            </Link>
            {' · '}
            <Link href="https://tryqc.co/terms" style={link}>
              Terms of Service
            </Link>
          </Text>
          {unsubscribeUrl && (
            <Text style={footer}>
              <Link href={unsubscribeUrl} style={link}>
                Unsubscribe from QC emails
              </Link>
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  maxWidth: '560px',
  margin: '40px auto',
  padding: '32px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
}

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#111827',
  marginBottom: '16px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '16px',
}

const buttonSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const button = {
  display: 'inline-block',
  backgroundColor: '#e11d48',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
}

const footer = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
}

const link = {
  color: '#111827',
  textDecoration: 'underline',
}

const footerLinks = {
  fontSize: '12px',
  lineHeight: '16px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  marginTop: '24px',
}
