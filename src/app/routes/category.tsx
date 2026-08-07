import { Navigate, useParams } from 'react-router-dom'
import { CategoryExplorer, FILE_CATEGORIES } from '@/features/drive'

export default function CategoryRoute() {
  const { slug } = useParams()
  const category = FILE_CATEGORIES.find((c) => c.slug === slug)

  if (!category) return <Navigate to="/drive" replace />

  return <CategoryExplorer category={category.type} />
}
