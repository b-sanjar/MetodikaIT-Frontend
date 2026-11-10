import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import Button from './Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mb-4 shadow-sm">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Sahifani yuklashda xatolik yuz berdi
          </h2>
          <p className="mt-1.5 max-w-md text-xs text-gray-500 dark:text-gray-400">
            {this.state.error?.message || 'Kutilmagan xatolik yuz berdi. Iltimos, sahifani qayta yuklang.'}
          </p>
          <Button onClick={this.handleReset} className="mt-5 shadow-sm" size="sm">
            <RotateCcw size={14} className="mr-1.5" /> Sahifani qayta yuklash
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

