import React, { useState } from 'react';
import { X, Shield, FileText } from 'lucide-react';

export type ModalType = 'tos' | 'privacy' | null;

export function LegalModal({ type, onClose }: { type: ModalType; onClose: () => void }) {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            {type === 'tos' ? (
              <FileText className="w-5 h-5 text-orange-500" />
            ) : (
              <Shield className="w-5 h-5 text-orange-500" />
            )}
            <h2 className="text-base font-bold text-gray-900">
              {type === 'tos' ? 'Terms of Service' : 'Privacy Policy'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 text-sm text-gray-700 leading-relaxed space-y-5">
          {type === 'tos' ? <TermsContent /> : <PrivacyContent />}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50 sm:rounded-b-2xl">
          <p className="text-xs text-gray-400 text-center">
            Last updated: April 2026 &bull; Songa Ride Ltd &bull; Nairobi, Kenya
          </p>
        </div>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-gray-500 text-xs">
        These Terms of Service govern your use of the Songa platform and are subject to the laws of Kenya,
        including the <strong className="text-gray-700">National Transport and Safety Authority (NTSA) Act, Cap 403</strong>,
        the <strong className="text-gray-700">Traffic Act, Cap 403</strong>, and applicable regulations issued by
        the <strong className="text-gray-700">Kenya Revenue Authority (KRA)</strong> and the
        <strong className="text-gray-700"> Transport Licensing Board</strong>.
      </p>

      <Section title="1. Platform Overview">
        Songa is a digital ride-booking intermediary connecting passengers with licensed public service vehicle (PSV)
        operators in Kenya. Songa does not own or operate vehicles and acts solely as a technology facilitator in
        accordance with the <strong>National Transport and Safety Authority Act</strong>.
      </Section>

      <Section title="2. Driver Eligibility & Compliance">
        All drivers registering on Songa must hold a valid PSV licence issued by NTSA, maintain a roadworthy vehicle
        inspected and certified under the <strong>Traffic Act</strong>, carry a valid certificate of insurance under the
        <strong> Insurance (Motor Vehicles Third Party Risks) Act, Cap 405</strong>, and comply with all route permits
        issued by the relevant county government or the Transport Licensing Board.
      </Section>

      <Section title="3. Passenger Responsibilities">
        Passengers must provide accurate personal details during registration, pay agreed fares before boarding, comply
        with vehicle safety regulations including wearing seatbelts as required under the Traffic Act, and refrain from
        carrying prohibited goods as defined under Kenyan law.
      </Section>

      <Section title="4. Fares & Payments">
        All fares displayed on Songa are inclusive of applicable taxes. Payments are processed via M-Pesa in compliance
        with the <strong>National Payment System Act, 2011</strong>. Songa reserves the right to withhold payment to
        drivers found in breach of these terms or applicable transport regulations.
      </Section>

      <Section title="5. Cancellations & Refunds">
        Passengers who cancel a confirmed booking may receive a refund at Songa's discretion, subject to the timing of
        cancellation and the driver's incurred costs. Drivers who cancel confirmed bookings without reasonable cause may
        be suspended from the platform.
      </Section>

      <Section title="6. Safety Standards">
        Songa requires all drivers and vehicles to meet safety standards prescribed by NTSA. Drivers must not operate
        vehicles while under the influence of alcohol or drugs as prohibited under the Traffic Act. Speed limits and
        road traffic regulations must be observed at all times.
      </Section>

      <Section title="7. Dispute Resolution">
        Any disputes arising from use of the Songa platform shall first be resolved through Songa's internal dispute
        resolution process. Unresolved disputes may be escalated to the <strong>Consumer Federation of Kenya</strong> or
        referred to a competent court of jurisdiction in Nairobi, Kenya.
      </Section>

      <Section title="8. Limitation of Liability">
        Songa is not liable for losses arising from delays, accidents, or events beyond its reasonable control. Songa's
        maximum liability to any user shall not exceed the fare paid for the relevant trip. Nothing in these terms limits
        liability for death or personal injury caused by negligence under Kenyan law.
      </Section>

      <Section title="9. Amendments">
        Songa may update these Terms at any time. Continued use of the platform after notice of changes constitutes
        acceptance of the updated Terms.
      </Section>

      <Section title="10. Governing Law">
        These Terms are governed by the laws of the Republic of Kenya. The courts of Kenya shall have exclusive
        jurisdiction over any disputes.
      </Section>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-gray-500 text-xs">
        This Privacy Policy describes how Songa Ride Ltd collects, uses, and protects your personal data in compliance
        with the <strong className="text-gray-700">Kenya Data Protection Act, 2019 (DPA)</strong> and regulations made
        thereunder by the <strong className="text-gray-700">Office of the Data Protection Commissioner (ODPC)</strong>.
      </p>

      <Section title="1. Data We Collect">
        We collect your full name, phone number, and email address when you register. For drivers, we additionally collect
        vehicle registration, NTSA licence details, and profile photos. We collect trip data including pickup location,
        destination, seat number, and payment records to provide our service.
      </Section>

      <Section title="2. How We Use Your Data">
        Your data is used exclusively to facilitate bookings, process payments, send trip notifications, and improve
        platform safety. We do not use your data for advertising or sell it to third parties under any circumstances.
      </Section>

      <Section title="3. We Do Not Share Your Data">
        <strong>Songa does not sell, rent, or share your personal data with any third party.</strong> Your phone number
        is only revealed to the specific driver of a trip you have booked, and only for the purpose of coordinating
        that journey. Driver contact details are shared with passengers for the same purpose. No other personal data
        is disclosed externally.
      </Section>

      <Section title="4. Data Storage & Security">
        All data is stored on secure, encrypted servers. We implement technical and organisational measures consistent
        with industry best practice and the requirements of the DPA to protect your data from unauthorised access,
        alteration, disclosure, or destruction.
      </Section>

      <Section title="5. Your Rights Under the DPA">
        Under the Kenya Data Protection Act, 2019, you have the right to access the personal data we hold about you,
        request correction of inaccurate data, request deletion of your data (subject to legal obligations), object to
        processing of your data, and lodge a complaint with the Office of the Data Protection Commissioner.
      </Section>

      <Section title="6. Data Retention">
        We retain your personal data for as long as your account is active and as required by applicable Kenyan law,
        including tax and transport regulations. You may request account deletion by contacting us at
        songarideke@gmail.com.
      </Section>

      <Section title="7. Cookies & Analytics">
        Songa uses only essential session data necessary for the application to function. We do not use tracking cookies
        or third-party analytics tools that profile your behaviour.
      </Section>

      <Section title="8. Compliance">
        Songa is committed to full compliance with the Kenya Data Protection Act, 2019. We conduct regular reviews of
        our data practices and will notify users of any material changes to this policy.
      </Section>

      <Section title="9. Contact">
        For any data-related queries or to exercise your rights, contact our Data Protection Officer at:
        <br />
        <strong>Email:</strong> songarideke@gmail.com
        <br />
        <strong>Address:</strong> Songa Ride Ltd, Nairobi, Kenya
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function Footer() {
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <>
      <footer className="mt-auto border-t border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Songa Ride Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setModal('tos')}
              className="text-xs text-gray-500 hover:text-orange-600 transition-colors flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              Terms of Service
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={() => setModal('privacy')}
              className="text-xs text-gray-500 hover:text-orange-600 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>

      <LegalModal type={modal} onClose={() => setModal(null)} />
    </>
  );
}
