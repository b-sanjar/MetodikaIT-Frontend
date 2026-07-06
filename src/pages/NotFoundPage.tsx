import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Button from '../components/Button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-xl bg-primary-500/10 p-4 text-primary-500">
        <Compass size={32} />
      </div>
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">404</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Bunday sahifa topilmadi</p>
      </div>
      <Link to="/">
        <Button variant="outline">Bosh sahifaga qaytish</Button>
      </Link>
    </div>
  )
}
