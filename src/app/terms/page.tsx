import type { Metadata } from 'next';
import TermsPageClient from './TermsPageClient';

export const metadata: Metadata = {
  title: 'Terms of Use — WriteQuran',
};

export default function TermsPage() {
  return <TermsPageClient />;
}
