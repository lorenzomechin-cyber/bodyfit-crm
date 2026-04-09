import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--t2)' }}>
          <h2 style={{ fontFamily: 'var(--fm)', fontSize: 16 }}>Quelque chose s'est mal passé</h2>
          <button className="bt bp" onClick={() => this.setState({ hasError: false })}>Réessayer</button>
        </div>
      )
    }
    return this.props.children
  }
}
