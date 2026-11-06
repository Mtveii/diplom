import Modal from '@/components/Modal'
import GameDetailPage from '@/pages/GameDetailPage'
import type { UnifiedGameDto } from '@/types/catalog'

interface CatalogDetailModalProps {
  game: UnifiedGameDto
  onClose: () => void
  onShowMonitor: () => void
  onOpenDetail?: () => void
}

export default function CatalogDetailModal({ game, onClose, onOpenDetail }: CatalogDetailModalProps) {
  return (
    <Modal open onClose={onClose} title={game.name} wide>
      <GameDetailPage embedded initialGame={game} onOpenDetail={onOpenDetail} />
    </Modal>
  )
}
