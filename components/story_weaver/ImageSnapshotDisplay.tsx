
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageSnapshot } from '../../types';
import ImageModal from './ImageModal'; // Import the new modal component

interface ImageSnapshotDisplayProps {
  snapshots: ImageSnapshot[];
  isGenerating: boolean;
}

const ImageSnapshotDisplay: React.FC<ImageSnapshotDisplayProps> = ({ snapshots, isGenerating }) => {
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const olderSnapshots = snapshots.length > 1 ? snapshots.slice(0, -1).reverse() : []; // Newest of the old first

  const [selectedSnapshotForModal, setSelectedSnapshotForModal] = useState<ImageSnapshot | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState<number>(0);
  const [focusedThumbnailIndex, setFocusedThumbnailIndex] = useState<number>(-1);

  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  const openModalWithSnapshot = (snapshot: ImageSnapshot, index: number) => {
    setSelectedSnapshotForModal(snapshot);
    setModalImageIndex(index);
  };

  const closeModal = () => {
    setSelectedSnapshotForModal(null);
  };

  const navigateModal = (newIndex: number) => {
    if (snapshots && snapshots.length > 0) {
      const safeIndex = Math.max(0, Math.min(newIndex, snapshots.length - 1));
      setSelectedSnapshotForModal(snapshots[safeIndex]);
      setModalImageIndex(safeIndex);
    }
  };

  const handleThumbnailKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (olderSnapshots.length === 0) return;

    let newFocusedIndex = focusedThumbnailIndex;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      newFocusedIndex = (focusedThumbnailIndex + 1) % olderSnapshots.length;
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      newFocusedIndex = (focusedThumbnailIndex - 1 + olderSnapshots.length) % olderSnapshots.length;
    } else if ((event.key === 'Enter' || event.key === ' ') && focusedThumbnailIndex !== -1) {
      event.preventDefault();
      // olderSnapshots is reversed, so the modal index needs to be calculated from the original `snapshots` array
      const originalIndex = snapshots.indexOf(olderSnapshots[focusedThumbnailIndex]);
      openModalWithSnapshot(olderSnapshots[focusedThumbnailIndex], originalIndex);
    }
    setFocusedThumbnailIndex(newFocusedIndex);

    // Scroll the focused thumbnail into view
    if (thumbnailContainerRef.current) {
      const focusedChild = thumbnailContainerRef.current.children[newFocusedIndex] as HTMLElement;
      if (focusedChild) {
        focusedChild.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [focusedThumbnailIndex, olderSnapshots, snapshots, openModalWithSnapshot]);


  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (selectedSnapshotForModal) {
        if (event.key === 'Escape') {
          closeModal();
        } else if (event.key === 'ArrowRight') {
          navigateModal(modalImageIndex + 1);
        } else if (event.key === 'ArrowLeft') {
          navigateModal(modalImageIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [selectedSnapshotForModal, modalImageIndex, snapshots]);


  return (
    <>
      <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-base)] rounded-lg shadow-lg flex flex-col h-full overflow-hidden animate-breathing-border">
        <h3 className="text-sm font-bold text-[var(--color-text-heading)] p-3 border-b-2 border-[var(--color-border-base)] flex-shrink-0">
          VISUAL SNAPSHOT
        </h3>
        <div 
          className="flex-grow flex items-center justify-center p-3 relative bg-black bg-opacity-20 min-h-0 cursor-pointer group"
          onClick={() => latestSnapshot && openModalWithSnapshot(latestSnapshot, snapshots.length - 1)}
          role="button"
          tabIndex={latestSnapshot ? 0 : -1}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && latestSnapshot) {
              openModalWithSnapshot(latestSnapshot, snapshots.length - 1);
            }
          }}
          aria-label={latestSnapshot ? `View snapshot: ${latestSnapshot.prompt}` : "Awaiting visual data"}
        >
          {isGenerating && !latestSnapshot && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-10">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-500)]"></div>
              <p className="mt-4 text-sm text-[var(--color-system-message)] animate-pulse">Generating Image...</p>
            </div>
          )}
          {latestSnapshot ? (
            <div className="w-full h-full flex flex-col">
              <div className="relative flex-grow min-h-0">
                <img
                  src={latestSnapshot.url}
                  alt={latestSnapshot.prompt}
                  className="w-full h-full object-contain rounded transition-transform duration-300 ease-in-out group-hover:scale-105"
                />
                {isGenerating && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-10">
                      <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-[var(--color-primary-500)]"></div>
                      <p className="mt-2 text-xs text-[var(--color-system-message)] animate-pulse">Updating...</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] italic p-2 mt-2 bg-black bg-opacity-30 rounded flex-shrink-0 max-h-20 overflow-y-auto log-display">
                {latestSnapshot.prompt}
              </p>
            </div>
          ) : (
            !isGenerating && (
              <div className="text-center text-[var(--color-text-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm">Awaiting visual data...</p>
              </div>
            )
          )}
        </div>
        {olderSnapshots.length > 0 && (
          <div className="flex-shrink-0 p-2 border-t-2 border-[var(--color-border-base)] bg-black bg-opacity-10">
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-1.5">History:</h4>
            <div
              ref={thumbnailContainerRef}
              className="flex space-x-2 overflow-x-auto pb-1 thumbnail-scrollbar focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
              tabIndex={0} // Make it focusable
              onKeyDown={handleThumbnailKeyDown}
              aria-label="Image history thumbnails"
              role="toolbar"
            >
              {olderSnapshots.map((snap, index) => {
                const originalIndex = snapshots.indexOf(snap);
                return (
                  <div
                    key={snap.id}
                    className={`flex-shrink-0 w-20 h-20 border-2 rounded overflow-hidden relative group bg-black cursor-pointer
                                ${focusedThumbnailIndex === index ? 'border-[var(--color-primary-500)] ring-2 ring-[var(--color-primary-500)]' : 'border-[var(--color-border-strong)] hover:border-[var(--color-accent-400)]'}`}
                    onClick={() => openModalWithSnapshot(snap, originalIndex)}
                    role="button"
                    aria-label={`View snapshot: ${snap.prompt}`}
                    tabIndex={-1} // Individual items not tab-focusable, container handles navigation
                  >
                    <img
                      src={snap.url}
                      alt={snap.prompt}
                      title={snap.prompt}
                      className="w-full h-full object-cover transition-transform duration-200 ease-in-out group-hover:scale-110"
                    />
                  </div>
                );
                })}
            </div>
          </div>
        )}
      </div>
      {selectedSnapshotForModal && snapshots && (
        <ImageModal
          snapshot={selectedSnapshotForModal}
          allSnapshots={snapshots}
          currentIndex={modalImageIndex}
          onClose={closeModal}
          onNavigate={navigateModal}
        />
      )}
    </>
  );
};

export default ImageSnapshotDisplay;
