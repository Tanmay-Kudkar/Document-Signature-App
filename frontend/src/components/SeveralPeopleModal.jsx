import React, { useState } from 'react';
import { 
  GripVertical, X, Key, Smartphone, PenTool, Lock, 
  ChevronDown, ListOrdered, Calendar, Bell, Globe, 
  Mail, Fingerprint, QrCode 
} from 'lucide-react';

const RECEIVER_COLORS = ['#ffccd5', '#bbf7d0', '#bfdbfe', '#fef08a', '#e9d5ff'];

/* ==========================================================================
 * 👥 COMPONENT: SeveralPeopleModal
 * --------------------------------------------------------------------------
 * The primary configuration modal for the "Several People" document signing
 * flow. Allows the sender to dynamically add receivers, assign roles, 
 * configure authentication methods, and define document-wide settings like
 * expiration, reminders, and verification codes.
 * ========================================================================== */
export default function SeveralPeopleModal({ onCancel, onApply }) {
  const [receivers, setReceivers] = useState([
    { 
      id: 1, 
      name: '', 
      email: '', 
      phone: '',
      role: 'Signer', 
      showPassword: false, 
      password: '', 
      showFormat: false, 
      format: 'All signature formats', 
      showPhone: false 
    },
  ]);

  const [settings, setSettings] = useState({
    orderReceivers: false,
    expirationDate: false,
    expirationDays: 15,
    reminders: true,
    reminderDays: 1,
    language: false,
    customizeEmail: false,
    uuid: true,
    verificationCode: true,
  });

  const [error, setError] = useState('');

  /* ------------------------------------------------------------------------
   * ➕ FUNCTION: addReceiver
   * ------------------------------------------------------------------------
   * Appends a new, empty receiver object to the list.
   * ------------------------------------------------------------------------ */
  const addReceiver = () => {
    setReceivers([
      ...receivers,
      { 
        id: Date.now(), 
        name: '', 
        email: '', 
        phone: '',
        role: 'Signer', 
        showPassword: false, 
        password: '', 
        showFormat: false, 
        format: 'All signature formats', 
        showPhone: false 
      }
    ]);
  };

  /* ------------------------------------------------------------------------
   * ➖ FUNCTION: removeReceiver
   * ------------------------------------------------------------------------
   * Removes a receiver by ID, ensuring at least one receiver remains.
   * ------------------------------------------------------------------------ */
  const removeReceiver = (id) => {
    if (receivers.length > 1) {
      setReceivers(receivers.filter(r => r.id !== id));
    }
  };

  /* ------------------------------------------------------------------------
   * 🔄 FUNCTION: updateReceiver & toggleReceiverSetting
   * ------------------------------------------------------------------------
   * Helper functions to update specific properties or toggle boolean states
   * for an individual receiver in the list.
   * ------------------------------------------------------------------------ */
  const updateReceiver = (id, key, value) => {
    setReceivers(receivers.map(r => r.id === id ? { ...r, [key]: value } : r));
  };

  const toggleReceiverSetting = (id, key) => {
    setReceivers(receivers.map(r => r.id === id ? { ...r, [key]: !r[key] } : r));
  };

  /* ------------------------------------------------------------------------
   * 🚀 FUNCTION: handleApply
   * ------------------------------------------------------------------------
   * Bundles the current receivers and settings and passes them back to parent.
   * ------------------------------------------------------------------------ */
  const handleApply = () => {
    // Validation
    for (const r of receivers) {
      if (!r.name.trim() || !r.email.trim()) {
        setError(`Name and Email are mandatory for all receivers.`);
        return;
      }
      if (r.showPassword && !r.password.trim()) {
        setError(`Password cannot be empty for receiver ${r.name}.`);
        return;
      }
      if (r.showPhone && !r.phone.trim()) {
        setError(`Phone cannot be empty for receiver ${r.name}.`);
        return;
      }
    }
    setError('');
    onApply({ receivers, settings });
  };

  /* ==========================================================================
   * 🎨 RENDER UI
   * ========================================================================== */
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }} onClick={onCancel} />
      
      <div className="relative w-full bg-white rounded-2xl flex flex-col animate-fade-in" style={{ maxWidth: 850, maxHeight: '95vh', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        
        {/* ── MODAL HEADER ── */}
        <div className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-[20px] sm:text-[24px]">Create your signature request</h2>
        </div>
 
        {error && (
          <div className="px-4 py-3 sm:px-8 bg-red-50 border-b border-red-100 text-red-600 text-sm font-semibold flex items-center gap-2 shrink-0">
            <X size={16} className="cursor-pointer" onClick={() => setError('')} />
            {error}
          </div>
        )}
 
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6 custom-scrollbar">
          
          <div className="mb-8 sm:mb-10">
            <h3 className="text-[14px] sm:text-[15px] text-gray-600 mb-3 sm:mb-4">Who will receive your document?</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              {receivers.map((r, i) => (
                <div key={r.id} className="border-b border-gray-200 last:border-b-0">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-white">
                    {/* Header elements in a row: Drag, color dot, role selector, delete button */}
                    <div className="flex items-center gap-2">
                      {/* Drag Handle */}
                      <div className="flex flex-col items-center justify-center cursor-ns-resize px-1 text-gray-400 hover:text-gray-600">
                        <GripVertical size={16} />
                      </div>
 
                      {/* Color dot */}
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full shrink-0" style={{ background: RECEIVER_COLORS[i % RECEIVER_COLORS.length] }}></div>
 
                      {/* Role */}
                      <select 
                        value={r.role} 
                        onChange={e => updateReceiver(r.id, 'role', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 bg-white cursor-pointer"
                      >
                        <option value="Signer">Signer</option>
                        <option value="Validator">Validator</option>
                        <option value="Witness">Witness</option>
                      </select>
 
                      {/* Delete button for mobile */}
                      <button onClick={() => removeReceiver(r.id)} className="w-8 h-8 flex sm:hidden items-center justify-center ml-auto text-gray-500 hover:text-red-500 transition">
                        <X size={18} />
                      </button>
                    </div>
 
                    {/* Input columns: Name & Email */}
                    <div className="flex flex-col md:flex-row gap-2 flex-1">
                      {/* Name */}
                      <input 
                        type="text" 
                        placeholder="Name" 
                        value={r.name} 
                        onChange={e => updateReceiver(r.id, 'name', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 transition"
                      />
 
                      {/* Email */}
                      <div className="flex-1 relative flex items-center border border-gray-300 rounded overflow-hidden focus-within:border-blue-500 transition">
                        <input 
                          type="email" 
                          placeholder="Email"
                          value={r.email} 
                          onChange={e => updateReceiver(r.id, 'email', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm outline-none w-full"
                        />
                      </div>
                    </div>
 
                    {/* Action toggles */}
                    <div className="flex items-center gap-1.5 sm:ml-auto justify-end">
                      <button onClick={() => toggleReceiverSetting(r.id, 'showPassword')} className={`w-7 h-7 flex items-center justify-center rounded-full transition ${r.showPassword ? 'bg-[#0052cc] text-white' : 'bg-gray-300 text-white hover:bg-gray-400'}`} title="Password protection">
                        <Key size={14} />
                      </button>
                      <button onClick={() => toggleReceiverSetting(r.id, 'showPhone')} className={`w-7 h-7 flex items-center justify-center rounded-full transition ${r.showPhone ? 'bg-[#0052cc] text-white' : 'bg-gray-300 text-white hover:bg-gray-400'}`} title="Use Phone/SMS">
                        <Smartphone size={14} />
                      </button>
                      <button onClick={() => toggleReceiverSetting(r.id, 'showFormat')} className={`w-7 h-7 flex items-center justify-center rounded-full transition ${r.showFormat ? 'bg-[#0052cc] text-white' : 'bg-gray-300 text-white hover:bg-gray-400'}`} title="Signature formats">
                        <PenTool size={14} />
                      </button>
                      
                      <button onClick={() => removeReceiver(r.id)} className="hidden sm:flex w-8 h-8 items-center justify-center ml-2 text-gray-500 hover:text-red-500 transition">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
 
                  {/* Expanded rows for toggles */}
                  {(r.showPassword || r.showPhone || r.showFormat) && (
                    <div className="px-6 sm:px-14 pb-3 flex flex-wrap gap-4 items-center bg-[#fafbfc]">
                      
                      {/* Password Config */}
                      {r.showPassword && (
                        <div className="flex items-center border border-gray-300 rounded overflow-hidden shadow-sm bg-white">
                          <div className="px-2 text-gray-500">
                            <Lock size={14} />
                          </div>
                          <input type="text" placeholder="Type password" value={r.password} onChange={e => updateReceiver(r.id, 'password', e.target.value)} className="w-32 px-1 py-1.5 text-sm outline-none" />
                          <button onClick={() => toggleReceiverSetting(r.id, 'showPassword')} className="bg-[#e8222c] text-white px-2 py-2 hover:bg-red-600 transition">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      
                      {/* Phone Config */}
                      {r.showPhone && (
                        <div className="flex items-center">
                          <div className="flex items-center border border-gray-300 rounded overflow-hidden shadow-sm bg-white focus-within:border-blue-500 transition">
                            <div className="shrink-0 px-2 py-1.5 border-r border-gray-300 bg-gray-50 flex items-center gap-1 cursor-pointer">
                              <span className="text-xs">🇮🇳</span>
                              <ChevronDown size={12} className="text-gray-500" />
                            </div>
                            <input 
                              type="text" 
                              placeholder="Phone"
                              value={r.phone} 
                              onChange={e => updateReceiver(r.id, 'phone', e.target.value)}
                              className="w-32 px-2 py-1.5 text-sm outline-none"
                            />
                          </div>
                          <button onClick={() => toggleReceiverSetting(r.id, 'showPhone')} className="ml-2 text-gray-500 hover:text-gray-700">
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {/* Signature Format Config */}
                      {r.showFormat && (
                        <div className="flex items-center">
                          <select value={r.format} onChange={e => updateReceiver(r.id, 'format', e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm outline-none bg-white min-w-[160px] shadow-sm">
                            <option value="All signature formats">All signature formats</option>
                            <option value="Text-only signature">Text-only signature</option>
                            <option value="Drawn signature">Drawn signature</option>
                            <option value="Uploaded signature">Uploaded signature</option>
                          </select>
                          <button onClick={() => toggleReceiverSetting(r.id, 'showFormat')} className="ml-2 text-gray-500 hover:text-gray-700">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className="bg-[#f4f5f7] hover:bg-[#ebecf0] transition cursor-pointer text-center py-3 border-t border-gray-200 text-[#0052cc] text-sm font-semibold flex items-center justify-center gap-2" onClick={addReceiver}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                ADD RECEIVER
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-4">Settings</h3>
            <div className="space-y-0">
              
              {/* Order */}
              <div className="flex items-start gap-4 py-4 border-b border-gray-100">
                <input type="checkbox" checked={settings.orderReceivers} onChange={e => setSettings({...settings, orderReceivers: e.target.checked})} className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#172b4d] mb-1">
                    <ListOrdered size={16} className="text-[#0052cc]" />
                    Set the order of receivers
                  </div>
                  <p className="text-sm text-gray-600">Select this option to set a signing order. A signer won't receive a request until the previous person has completed their document.</p>
                </div>
              </div>

              {/* Expiration */}
              <div className="flex items-start gap-4 py-4 border-b border-gray-100">
                <input type="checkbox" checked={settings.expirationDate} onChange={e => setSettings({...settings, expirationDate: e.target.checked})} className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#172b4d] mb-1">
                    <Calendar size={16} className="text-[#0052cc]" />
                    Change expiration date
                  </div>
                  {settings.expirationDate ? (
                    <div className="text-sm text-gray-600">
                      The document will expire in 
                      <input type="number" min="1" value={settings.expirationDays} onChange={e => setSettings({...settings, expirationDays: parseInt(e.target.value)||1})} className="mx-2 w-12 border border-gray-300 rounded px-1 py-0.5 text-center outline-none" />
                      days.
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">The document will expire in 15 days.</div>
                  )}
                </div>
              </div>

              {/* Reminders */}
              <div className="flex items-start gap-4 py-4 border-b border-gray-100">
                <input type="checkbox" checked={settings.reminders} onChange={e => setSettings({...settings, reminders: e.target.checked})} className="mt-1 w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500 accent-green-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#172b4d] mb-1">
                    <Bell size={16} className="text-[#0052cc]" />
                    Enable reminders
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    Send a reminder to the participants every
                    {settings.reminders ? (
                      <input type="number" min="1" value={settings.reminderDays} onChange={e => setSettings({...settings, reminderDays: parseInt(e.target.value)||1})} className="w-12 border border-gray-300 rounded px-1 py-0.5 text-center outline-none" />
                    ) : (
                      <span>1</span>
                    )}
                    days.
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="flex items-start gap-4 py-4 border-b border-gray-100">
                <input type="checkbox" checked={settings.language} onChange={e => setSettings({...settings, language: e.target.checked})} className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#172b4d] mb-1">
                    <Globe size={16} className="text-[#0052cc]" />
                    Set language
                  </div>
                  <div className="text-sm text-gray-600">Notifications will be sent in <strong>English</strong>.</div>
                </div>
              </div>

              {/* Customize email */}
              <div className="flex items-start gap-4 py-4 border-b border-gray-100">
                <input type="checkbox" checked={settings.customizeEmail} onChange={e => setSettings({...settings, customizeEmail: e.target.checked})} className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#172b4d] mb-1">
                    <Mail size={16} className="text-[#0052cc]" />
                    Customize the request email
                  </div>
                  <div className="text-sm text-gray-600">Edit the text you want to appear in the subject and body of the signature request email.</div>
                </div>
              </div>

              {/* UUID */}
              <div className="flex items-start gap-4 py-4 border-b border-gray-100">
                <input type="checkbox" checked={settings.uuid} onChange={e => setSettings({...settings, uuid: e.target.checked})} className="mt-1 w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500 accent-green-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#172b4d] mb-1">
                    <Fingerprint size={16} className="text-[#0052cc]" />
                    UUID (recommended)
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    Show the Unique Signer Identifier code that appears below the signatures to help validate the signature on the Audit Trail. <strong>It is recommended that you keep this activated</strong>, otherwise it lowers the legal weight of the end document.
                  </div>
                </div>
              </div>

              {/* Signature verification code */}
              <div className="flex items-start gap-4 py-4">
                <input type="checkbox" checked={settings.verificationCode} onChange={e => setSettings({...settings, verificationCode: e.target.checked})} className="mt-1 w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500 accent-green-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#172b4d] mb-1">
                    <QrCode size={16} className="text-[#0052cc]" />
                    Signature verification code
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed mb-2">
                    Digitally verify the integrity of the printed document using a QR code and a unique password that are provided in the Audit Trail.
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Highly recommended</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-4 py-3 sm:px-8 sm:py-4 border-t border-gray-100 bg-white rounded-b-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <button onClick={onCancel} className="font-bold text-[#e8222c] hover:underline px-4 transition text-[15px]">
            Cancel
          </button>
          <button onClick={handleApply} className="text-white font-bold px-6 sm:px-8 py-2.5 rounded transition hover:opacity-90 text-[15px] shadow-sm" style={{ background: '#f58c8a' }}>
            Apply
          </button>
        </div>

      </div>
    </div>
  );
}
