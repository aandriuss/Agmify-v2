type EmitFn = (event: 'close') => void

interface UseScheduleEmitsOptions {
  emit: EmitFn
}

export function useScheduleEmits(options: UseScheduleEmitsOptions) {
  const { emit } = options

  const handleClose = () => {
    emit('close')
  }

  return {
    handleClose
  }
}
