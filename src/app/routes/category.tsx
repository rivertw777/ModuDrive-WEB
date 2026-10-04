import { Navigate, useParams } from 'react-router-dom'
import { CategoryExplorer } from '@/features/drive'
import { FILE_CATEGORIES } from '@/types/file'

export default function CategoryRoute() {
  const { slug } = useParams()
  const category = FILE_CATEGORIES.find((c) => c.slug === slug)

  if (!category) return <Navigate to="/drive" replace />

  return <CategoryExplorer category={category.type} />
}
