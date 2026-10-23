import { Link } from 'react-router-dom'
import { Send, ArrowRight, Mail } from 'lucide-react'

export default function Landing() {
  return <div className="landing">
    <div className="landing-photo">
      <div className="photo-overlay">
        <span className="eyebrow">YOUR SPACE TO FOCUS</span>
        <h2>Make room for<br/>meaningful work.</h2>
        <p>A calmer way to turn plans into progress.</p>
      </div>
    </div>
    <div className="landing-panel">
      <Link to="/dashboard" className="brand"><span className="brand-mark"><Send size={18} fill="currentColor"/></span><span>TaskPilot <b>AI</b></span></Link>
      <div className="landing-copy">
        <span className="eyebrow orange-eyebrow">PLAN SMARTER. DO MORE.</span>
        <h1>Turn ideas<br/>into real progress.</h1>
        <p className="landing-desc">An all-in-one productivity workspace with AI, automation, and collaboration.</p>
        <Link to="/dashboard" className="auth-btn google-btn"><span className="google-g">G</span> Continue with Google</Link>
        <Link to="/dashboard" className="auth-btn"><Mail size={17}/> Sign in with email</Link>
        <div className="or-divider"><span>or</span></div>
        <Link className="create-link" to="/dashboard">Create a new account <ArrowRight size={14}/></Link>
        <small className="prototype-note">UI starter: connect these actions to your authentication provider.</small>
      </div>
      <div className="landing-footer">Thoughtfully designed for your everyday work.</div>
    </div>
  </div>
}
