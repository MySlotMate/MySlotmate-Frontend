"use client";

import { useState } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { SupportPageShell } from "~/components/support";

interface TermSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: TermSection[] = [
  {
    id: "host-terms",
    title: "Host Terms of Engagement",
    content: (
      <div className="space-y-6">
        <p className="text-gray-700">
          This Host Terms of Engagement (&quot;Agreement&quot;) is a legally binding
          contract between Myslotmate Private Limited (&quot;Company,&quot; &quot;we,&quot; &quot;our&quot;)
          and you, the individual or entity accepting these terms (&quot;Host&quot; or
          &quot;you&quot;). By clicking &quot;I Agree&quot; or using the Myslotmate platform as a
          host, you acknowledge that you have read, understood, and agree to be
          bound by the terms of this Agreement.
        </p>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">1. Definitions</h4>
          <ul className="space-y-3 ml-4">
            <li className="text-gray-700">
              <strong>&quot;Platform&quot;</strong> means the Myslotmate website, mobile
              application, and any related services provided by the Company.
            </li>
            <li className="text-gray-700">
              <strong>&quot;Host Services&quot;</strong> refers to the platonic
              companionship services provided by the Host through the Platform,
              including but not limited to activities like coffee meetups,
              guided tours, workshops, and adventures.
            </li>
            <li className="text-gray-700">
              <strong>&quot;User&quot;</strong> means any individual who books Host
              Services via the Platform.
            </li>
            <li className="text-gray-700">
              <strong>&quot;Booking&quot;</strong> means a confirmed reservation for Host
              Services made by a User through the Platform.
            </li>
            <li className="text-gray-700">
              <strong>&quot;Booking Value&quot;</strong> refers to the total amount paid
              by the User for the Host Services, excluding applicable taxes and
              fees.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            2. Eligibility and Registration
          </h4>
          <div className="space-y-3 ml-4">
            <div>
              <p className="font-medium text-gray-900 mb-2">
                2.1 Eligibility Requirements
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Be at least 21 years of age.</li>
                <li>
                  Have the legal capacity to enter into this Agreement and
                  provide Host Services.
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-2">
                2.2 Verification Process
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>
                  <strong>Identity Verification:</strong> Complete Aadhaar-based
                  e-KYC or submit other government-issued ID.
                </li>
                <li>
                  <strong>Background Check:</strong> Agree to undergo a
                  third-party background check for security purposes.
                </li>
                <li>
                  <strong>Bank Account Verification:</strong> Provide valid bank
                  account details for payment processing.
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-2">
                2.3 Accurate Information
              </p>
              <p className="text-gray-700 ml-2">
                You agree to provide accurate and complete information during
                registration and maintain an up-to-date profile. Providing
                false or misleading information will result in termination of
                your participation and potential legal action.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            3. Independent Contractor Status
          </h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <p>
              <strong>3.1 Independent Contractor:</strong> You are an
              independent contractor and not an employee, agent, or partner of
              the Company. You have the freedom to set your own schedule and
              manner of delivering the Host Services, subject to compliance with
              this Agreement.
            </p>
            <p>
              <strong>3.2 Taxes and Legal Compliance:</strong> You are solely
              responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Determining any taxes applicable to your earnings.</li>
              <li>
                Reporting your income to the relevant tax authorities and
                maintaining your tax obligations (e.g., GST, income tax).
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            4. Host Obligations and Responsibilities
          </h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <p>
              <strong>4.1 Professional Conduct:</strong> You must provide Host
              Services in a professional, respectful, and timely manner. Your
              interactions with Users should be based on mutual respect and
              understanding.
            </p>
            <p>
              <strong>4.2 Strictly Platonic:</strong> All Host Services must
              remain strictly platonic. Under no circumstances should any
              romantic, sexual, or inappropriate behavior occur during your
              engagements with Users. Any violation of this policy will result
              in immediate removal from the Platform.
            </p>
            <p>
              <strong>4.3 Safety and Compliance:</strong> You are responsible
              for ensuring a safe environment for yourself and the Users,
              following all applicable laws and regulations during the provision
              of Host Services.
            </p>
            <p>
              <strong>4.4 Accuracy of Services:</strong> You must ensure that
              your profile and service offerings are accurate and reflect the
              services you are able to provide. Misleading or false descriptions
              are grounds for termination.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">5. Financial Terms</h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <div>
              <p className="font-medium text-gray-900 mb-2">
                5.1 Fees and Payment
              </p>
              <ul className="space-y-1 ml-2">
                <li>
                  The Company retains 30% of the Booking Value as a platform
                  fee.
                </li>
                <li>
                  You will receive 70% of the Booking Value after the User has
                  paid and the booking has been completed.
                </li>
              </ul>
            </div>
            <p>
              <strong>5.2 Payment Processing:</strong> Payments for Host
              Services will be processed through the Platform&apos;s payment gateway,
              and will be transferred to your bank account within 7 business
              days after the service is successfully completed.
            </p>
            <p>
              <strong>5.3 GST Compliance:</strong> If you are registered for
              GST, you must provide the Company with a valid GST invoice for the
              payments received. The Company is not responsible for your GST
              obligations.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            6. Intellectual Property
          </h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <p>
              <strong>6.1 License Grant:</strong> By agreeing to this Agreement,
              you grant the Company a limited, non-exclusive, royalty-free
              license to use, display, and distribute your name, profile, and
              related content solely for the purposes of operating the Platform
              and conducting promotional and marketing activities during the
              term of this Agreement and for a period of up to 12 months
              following its termination. After this period, the Company will
              cease use of your name, image, and profile content unless further
              consent is obtained.
            </p>
            <p>
              <strong>6.2 Company&apos;s Intellectual Property:</strong> All
              intellectual property rights related to the Platform, including
              logos, trademarks, and technology, shall remain the exclusive
              property of the Company.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">7. Confidentiality</h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <p>
              <strong>7.1 Confidential Information:</strong> You agree to keep
              any non-public information about the Company, Users, or other
              Hosts confidential. This includes personal data, business
              operations, and platform strategies.
            </p>
            <p>
              <strong>7.2 Survival of Confidentiality Obligation:</strong> This
              obligation survives the termination of this Agreement and remains
              in effect for three years after such termination.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            8. Limitation of Liability and Indemnification
          </h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <p>
              <strong>8.1 Limitation of Liability:</strong> The Company&apos;s
              liability to you is limited to the total amount of fees you&apos;ve
              earned in the last three months prior to the event giving rise to
              the claim.
            </p>
            <p>
              <strong>8.2 Indemnification:</strong> You agree to indemnify and
              hold the Company harmless from any claims, losses, damages, or
              legal actions arising from your actions, your provision of Host
              Services, or any breach of this Agreement.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">9. Termination</h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <p>
              <strong>9.1 Termination by Host:</strong> You may terminate your
              participation in the Platform at any time by deactivating your
              account.
            </p>
            <div>
              <p className="font-medium text-gray-900 mb-2">
                9.2 Termination by Company
              </p>
              <p className="mb-2">
                The Company may terminate this Agreement immediately by written
                notice if you:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  Materially breach any term of this Agreement, including the
                  strictly platonic requirement, and fail to remedy such breach
                  within 7 days of receiving written notice;
                </li>
                <li>
                  Engage in illegal, fraudulent, or unsafe activities, which
                  will result in immediate termination without a cure period.
                </li>
              </ul>
            </div>
            <p>
              <strong>9.3 Effect of Termination:</strong> Upon termination, your
              access to the Platform will be revoked, and your account will be
              deactivated. Any fees owed to you for services completed prior to
              termination will be paid. Provisions relating to confidentiality,
              intellectual property, indemnity, and any other clauses intended
              to survive termination shall remain in effect.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            10. Governing Law and Dispute Resolution
          </h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <p>
              <strong>10.1 Governing Law:</strong> This Agreement will be
              governed by the laws of India.
            </p>
            <p>
              <strong>10.2 Dispute Resolution:</strong> Any disputes arising
              under this Agreement will first be attempted to be resolved through
              mediation. If mediation fails, the dispute will be resolved through
              binding arbitration under the Arbitration and Conciliation Act,
              1996, in Guwahati, Assam.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">11. Miscellaneous</h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <p>
              <strong>11.1 Entire Agreement:</strong> This Agreement represents
              the entire understanding between you and the Company regarding your
              participation on the Platform.
            </p>
            <p>
              <strong>11.2 Amendment:</strong> The Company may update or modify
              this Agreement at any time. You will be notified of any changes,
              and continued use of the Platform will indicate your acceptance of
              the updated terms.
            </p>
            <p>
              <strong>11.3 Force Majeure:</strong> The Company will not be
              liable for delays or failures in performance due to causes beyond
              its reasonable control, such as natural disasters or government
              actions.
            </p>
            <p>
              <strong>11.4 No Waiver:</strong> Failure to enforce any provision
              of this Agreement will not be deemed a waiver of that provision or
              any other.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "content-license",
    title: "Content Licensing Agreement",
    content: (
      <div className="space-y-6">
        <p className="text-gray-700">
          This Content Licensing Agreement (&quot;Agreement&quot;) is entered into by and
          between [Creator Name](&quot;Creator&quot;) and Myslotmate Private Limited
          (&quot;Company,&quot; &quot;we,&quot; &quot;our&quot;), effective as of the date the Creator submits
          content (&quot;Effective Date&quot;).
        </p>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">1. Definitions</h4>
          <div className="space-y-2 ml-4 text-gray-700">
            <p>
              <strong>1.1 Content:</strong> All materials created and submitted
              by the Creator to the Company, including but not limited to
              photos, videos, audio recordings, text, graphics, profiles, and
              any other creative works.
            </p>
            <p>
              <strong>1.2 Platform:</strong> The Myslotmate website, mobile
              application, and all related services operated by the Company.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">2. Grant of License</h4>
          <div className="space-y-3 ml-4 text-gray-700">
            <p>
              <strong>2.1</strong> The Creator hereby grants the Company a
              non-exclusive, worldwide, royalty-free, sublicensable, and
              transferable license to use, reproduce, distribute, publicly
              display, perform, modify, adapt, create derivative works of, and
              otherwise exploit the Content in connection with Platform
              operations, marketing, advertising, and promotions.
            </p>
            <p>
              <strong>2.2</strong> This license is granted for the duration of
              the Agreement and for a period of 12 months thereafter, unless
              otherwise terminated in accordance with this Agreement.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            3. Ownership and Rights
          </h4>
          <div className="space-y-2 ml-4 text-gray-700">
            <p>
              <strong>3.1</strong> The Creator retains all ownership rights to
              the Content.
            </p>
            <p>
              <strong>3.2</strong> The Company acknowledges that it does not
              acquire ownership rights but only a license to use the Content as
              described.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            4. Representations and Warranties
          </h4>
          <div className="space-y-3 ml-4">
            <p className="font-medium text-gray-900">
              4.1 The Creator represents and warrants that:
            </p>
            <ul className="space-y-1 ml-4 text-gray-700">
              <li>
                They are the sole owner or have necessary rights and permissions
                to grant the license.
              </li>
              <li>
                The Content does not infringe on any third-party intellectual
                property or privacy rights.
              </li>
              <li>
                The Content complies with all applicable laws and does not
                contain unlawful or offensive material.
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">5. Compensation</h4>
          <div className="space-y-2 ml-4 text-gray-700">
            <p>
              <strong>5.1</strong> Unless otherwise agreed in writing, the
              Creator grants this license without monetary compensation.
            </p>
            <p>
              <strong>5.2</strong> If compensation is agreed upon, separate
              terms will outline payment schedule and amounts.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            6. Term and Termination
          </h4>
          <div className="space-y-2 ml-4 text-gray-700">
            <p>
              <strong>6.1</strong> This Agreement remains in effect unless
              terminated by either party with 30 days&apos; prior written notice.
            </p>
            <p>
              <strong>6.2</strong> Upon termination, the Company will cease
              future use of the Content, but prior authorized uses will remain
              valid.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">7. Indemnification</h4>
          <p className="ml-4 text-gray-700">
            The Creator agrees to indemnify and hold the Company harmless
            against any claims, damages, or liabilities arising from breach of
            the warranties or violation of third-party rights related to the
            Content.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            8. Limitation of Liability
          </h4>
          <p className="ml-4 text-gray-700">
            The Company&apos;s liability relating to the use of Content is limited to
            direct damages and will not include indirect, incidental, or
            consequential damages.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">9. Miscellaneous</h4>
          <div className="space-y-2 ml-4 text-gray-700">
            <p>
              <strong>9.1</strong> This Agreement constitutes the entire
              agreement between the parties regarding the Content license and
              supersedes prior communications.
            </p>
            <p>
              <strong>9.2</strong> Amendments must be made in writing and signed
              by both parties.
            </p>
            <p>
              <strong>9.3</strong> This Agreement is governed by the laws of
              India, with jurisdiction in Guwahati, Assam.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "guest-guide",
    title: "Guest Conduct Guide",
    content: (
      <div className="space-y-6">
        <p className="text-gray-700">
          Welcome to Myslotmate! To ensure a positive, respectful, and safe
          experience for everyone, please read and follow these guidelines when
          booking and interacting with Hosts on our platform.
        </p>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            1. Respect Platonic Boundaries
          </h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              All Host services are strictly platonic. Refrain from romantic,
              sexual, or inappropriate behavior during any engagement.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Respect your Host&apos;s personal boundaries at all times.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            2. Communicate Clearly and Politely
          </h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Use respectful language in all communications with Hosts and
              Myslotmate staff.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Provide clear details about your booking and any special
              requirements in advance.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Be punctual and notify your Host promptly if plans change.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">3. Safety and Privacy</h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Respect the privacy of your Host and do not share their personal
              information outside of the Platform without consent.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Follow any safety guidelines or instructions provided by your
              Host.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            4. Booking and Payment
          </h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Make bookings only through the Myslotmate Platform. Avoid
              off-platform transactions to ensure safety and compliance.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Pay promptly via the Platform as agreed to confirm your booking.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            5. Conduct During Meetings
          </h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Maintain professional and courteous behavior.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Do not engage in illegal activities or behavior that may cause
              harm or discomfort.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            6. Feedback and Reporting
          </h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Provide honest and constructive feedback after your experience to
              help improve the platform.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Report any inappropriate behavior, safety concerns, or violations
              of these guidelines to Myslotmate immediately through the
              Platform&apos;s reporting tools.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            7. Consequences of Misconduct
          </h4>
          <p className="ml-4 text-gray-700">
            Myslotmate reserves the right to suspend or terminate your account
            for violation of these guidelines or any unlawful behavior. Serious
            offenses may be referred to legal authorities.
          </p>
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-gray-900">
            Thank you for helping us maintain a safe and welcoming community! If
            you have questions or need support, contact Myslotmate support
            anytime.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "cancellation",
    title: "Cancellations & Refunds Policy",
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">1. Overview</h4>
          <p className="ml-4 text-gray-700">
            This policy outlines the terms and conditions regarding cancellations
            and refunds for bookings made through the Myslotmate Platform.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">2. Cancellation by Guest</h4>
          <div className="space-y-3 ml-4">
            <p className="text-gray-700">
              <strong>2.1</strong> Guests may cancel a confirmed booking via the
              Platform prior to the scheduled session.
            </p>
            <div>
              <p className="font-medium text-gray-900 mb-2">
                2.2 Refund eligibility
              </p>
              <div className="space-y-2 text-gray-700">
                <div className="flex gap-3 bg-gray-50 rounded p-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <div>
                    <p className="font-medium">More than 48 hours before:</p>
                    <p>Full refund (minus any payment gateway fees)</p>
                  </div>
                </div>
                <div className="flex gap-3 bg-gray-50 rounded p-3">
                  <span className="text-orange-600 font-bold">50%</span>
                  <div>
                    <p className="font-medium">24 to 48 hours before:</p>
                    <p>50% refund of the Booking Value</p>
                  </div>
                </div>
                <div className="flex gap-3 bg-red-50 rounded p-3">
                  <span className="text-red-600 font-bold">✗</span>
                  <div>
                    <p className="font-medium">Less than 24 hours before:</p>
                    <p>No refund</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-gray-700">
              <strong>2.3</strong> Refunds, if applicable, will be processed back
              to the original payment method within 7-10 business days after
              cancellation confirmation.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">3. Cancellation by Host</h4>
          <div className="space-y-2 ml-4 text-gray-700">
            <p>
              <strong>3.1</strong> Hosts may cancel a confirmed booking only in
              exceptional circumstances (e.g., illness, emergency).
            </p>
            <p>
              <strong>3.2</strong> If a Host cancels:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Guests will receive a full refund.</li>
              <li>
                Myslotmate may assist in rebooking with another Host, if
                available.
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">4. No-Shows</h4>
          <div className="space-y-2 ml-4 text-gray-700">
            <p>
              <strong>4.1</strong> If a Guest does not show up without prior
              cancellation, no refund will be issued.
            </p>
            <p>
              <strong>4.2</strong> If a Host fails to attend a scheduled session,
              the Guest will receive a full refund.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            5. Refund Requests and Disputes
          </h4>
          <div className="space-y-2 ml-4 text-gray-700">
            <p>
              <strong>5.1</strong> All refund requests must be submitted through
              the Platform&apos;s official channels.
            </p>
            <p>
              <strong>5.2</strong> Myslotmate reserves the right to investigate
              and verify claims before issuing refunds.
            </p>
            <p>
              <strong>5.3</strong> Refund decisions made by Myslotmate are final
              and binding.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            6. Modifications to Bookings
          </h4>
          <div className="space-y-2 ml-4 text-gray-700">
            <p>
              <strong>6.1</strong> Guests may request changes to session date or
              time subject to Host availability.
            </p>
            <p>
              <strong>6.2</strong> Any modifications must be made at least 24
              hours before the original booking and are subject to confirmation.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">7. Force Majeure</h4>
          <p className="ml-4 text-gray-700">
            <strong>7.1</strong> Myslotmate is not liable for cancellations or
            refunds arising from events beyond reasonable control (natural
            disasters, government orders, emergencies).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "safety",
    title: "Safety Tips & Help Tools",
    content: (
      <div className="space-y-6">
        <p className="text-gray-700">
          At Myslotmate, your safety and well-being are our utmost priority.
          Whether you are a Host or a Guest, please follow these recommended
          tips and use our available help tools to ensure your experience is
          safe, respectful, and enjoyable.
        </p>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">1. Before the Session</h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <span>
                <strong>Verify Profiles:</strong> Take time to review your
                Host&apos;s or Guest&apos;s profile, including ratings and reviews. Trust
                verified profiles with completed checks.
              </span>
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <span>
                <strong>Communicate Within the Platform:</strong> Use
                Myslotmate&apos;s messaging system for all conversations and bookings
                to ensure security and transparency.
              </span>
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <span>
                <strong>Plan for Public Meetings:</strong> For initial meetings,
                choose well-populated, public places to ensure safety.
              </span>
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <span>
                <strong>Share Your Plans:</strong> Let a trusted person know
                your schedule, location, and whom you&apos;re meeting. Consider
                sharing your live location using the Platform&apos;s SOS feature.
              </span>
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <span>
                <strong>Set Clear Expectations:</strong> Clearly discuss the
                details of the engagement ahead of time (time, place, nature of
                the service).
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">2. During the Session</h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <span>
                <strong>Trust Your Instincts:</strong> If anything feels off or
                uncomfortable, prioritize your safety by ending the session or
                leaving.
              </span>
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <span>
                <strong>Maintain Privacy:</strong> Avoid sharing sensitive
                personal information such as home address or financial details.
              </span>
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <span>
                <strong>Stay Sober and Alert:</strong> Avoid using substances
                that could impair your ability to make safe decisions.
              </span>
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <span>
                <strong>Respect Boundaries:</strong> Keep all interactions
                professional and strictly platonic as per platform rules.
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">3. After the Session</h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <strong>Provide Feedback:</strong> Help the community by leaving
              honest reviews and ratings.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              <strong>Report Concerns:</strong> Use the Platform&apos;s reporting
              tools immediately to flag any inappropriate behavior or safety
              issues.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">4. Myslotmate Help Tools</h4>
          <div className="ml-4 space-y-3">
            <div className="flex gap-3 bg-blue-50 rounded-lg p-4">
              <div className="shrink-0 flex items-center">
                <FiCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">24/7 Support</p>
                <p className="text-sm text-gray-700">
                  Access round-the-clock assistance for any safety concerns or
                  platform issues.
                </p>
              </div>
            </div>
            <div className="flex gap-3 bg-blue-50 rounded-lg p-4">
              <div className="shrink-0 flex items-center">
                <FiCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">SOS Emergency Button</p>
                <p className="text-sm text-gray-700">
                  Use the in-app SOS feature to instantly alert emergency
                  contacts and Myslotmate support with your live location,
                  discreetly if needed.
                </p>
              </div>
            </div>
            <div className="flex gap-3 bg-blue-50 rounded-lg p-4">
              <div className="shrink-0 flex items-center">
                <FiCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Block and Report Function
                </p>
                <p className="text-sm text-gray-700">
                  Instantly block and report any user who behaves
                  inappropriately or violates Platform rules.
                </p>
              </div>
            </div>
            <div className="flex gap-3 bg-blue-50 rounded-lg p-4">
              <div className="shrink-0 flex items-center">
                <FiCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Safety Resources</p>
                <p className="text-sm text-gray-700">
                  Access safety guides, FAQs, and tips anytime through the
                  Myslotmate Help Center.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            5. Additional Recommendations
          </h4>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Keep your phone charged and accessible at all times.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Arrange your own transportation to and from sessions.
            </li>
            <li className="flex gap-2">
              <FiCheck className="mt-0.5 h-5 w-5 text-green-500 shrink-0" />
              Consider meeting during daytime hours, especially for the first
              few bookings.
            </li>
          </ul>
        </div>

        <div className="mt-8 rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-gray-900">
            Stay safe and enjoy your Myslotmate experience! For safety support
            or to report issues, contact Myslotmate Support anytime.
          </p>
        </div>
      </div>
    ),
  },
];

function CollapsibleSection({ section }: { section: TermSection }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 transition flex items-center justify-between"
      >
        <span>{section.title}</span>
        <FiChevronDown
          className={`h-5 w-5 text-gray-600 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="border-t border-gray-200 px-6 py-4 bg-white text-gray-700">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function TermsAndConditionsPage() {
  const [expandAll, setExpandAll] = useState(false);

  return (
    <SupportPageShell>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Terms & Conditions
          </h1>
          <p className="text-lg text-gray-600">
            Last Updated: March 26, 2026
          </p>
          <p className="text-gray-700 max-w-2xl">
            Please review our comprehensive terms and conditions, privacy
            policies, and usage guidelines. These documents outline the rights,
            responsibilities, and expectations for all Myslotmate users.
          </p>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">For Hosts</h3>
            <p className="text-sm text-blue-700">
              Review host obligations, payment terms, and engagement policies.
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <h3 className="font-semibold text-emerald-900 mb-2">For Guests</h3>
            <p className="text-sm text-emerald-700">
              Understand conduct guidelines, cancellation policies, and booking
              terms.
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <h3 className="font-semibold text-purple-900 mb-2">Safety First</h3>
            <p className="text-sm text-purple-700">
              Learn about our safety features and best practices for all users.
            </p>
          </div>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Terms & Policies
            </h2>
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            >
              {expandAll ? "Collapse All" : "Expand All"}
            </button>
          </div>

          <div className="space-y-3">
            {sections.map((section) => (
              <CollapsibleSection key={section.id} section={section} />
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-6 mt-8">
          <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
          <p className="text-gray-700 mb-4">
            If you have questions about these terms and conditions or need
            clarification on any policy, please don&apos;t hesitate to contact our
            support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="/support"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 transition"
            >
              Contact Support
            </a>
            <a
              href="/support/technical"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Technical Help
            </a>
          </div>
        </div>

        {/* Acknowledgement Section */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Acknowledgement</h3>
          <p className="text-amber-700 text-sm">
            By using Myslotmate, you acknowledge that you have read and
            understood these terms and conditions, and agree to be bound by
            their provisions. The Company reserves the right to update these
            terms at any time. Continued use of the platform following any
            modifications constitutes your acceptance of the updated terms.
          </p>
        </div>
      </div>
    </SupportPageShell>
  );
}
