import { useEffect, useState } from 'react'

type RotationListener = (isRotating: boolean) => void

let isRotating = false
const listeners = new Set<RotationListener>()

export function setRotating(rotating: boolean): void {
  isRotating = rotating
  notifyListeners()
}

export function getRotating(): boolean {
  return isRotating
}

export function addRotationListener(listener: RotationListener): void {
  listeners.add(listener)
}

export function removeRotationListener(listener: RotationListener): void {
  listeners.delete(listener)
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener(isRotating))
}

export function useRotatingSpinner(): boolean {
  const [rotating, setRotatingState] = useState(isRotating)

  useEffect(() => {
    const listener = (newRotating: boolean) => {
      setRotatingState(newRotating)
    }

    addRotationListener(listener)
    return () => removeRotationListener(listener)
  }, [])

  return rotating
}
