import { useParams } from 'react-router-dom'
import { DriveExplorer } from '@/features/drive'

export default function DriveRoute() {
  const { '*': splat } = useParams()
  const path = splat ? `/${splat}` : '/'

  return <DriveExplorer path={path} />
}
