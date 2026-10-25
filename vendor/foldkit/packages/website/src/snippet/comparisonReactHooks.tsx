const useKeyboardShortcuts = (dispatch: React.Dispatch<Action>): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (isModifier && event.shiftKey && key === 'z') {
        event.preventDefault()
        dispatch({ type: 'ClickedRedo' })
        return
      }
      if (isModifier && key === 'z') {
        event.preventDefault()
        dispatch({ type: 'ClickedUndo' })
        return
      }
      // ...
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])
}

const useMouseRelease = (
  isDrawing: boolean,
  dispatch: React.Dispatch<Action>,
): void => {
  useEffect(() => {
    if (!isDrawing) {
      return
    }

    const handleMouseUp = () => {
      dispatch({ type: 'ReleasedMouse' })
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [isDrawing, dispatch])
}
