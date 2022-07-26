import {
  Circle,
  GoogleMap,
  Marker,
  MarkerClusterer,
} from '@react-google-maps/api'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CloseButton, Container, CreateTree } from './Map.styled'
import { Coordinates } from '../../shared/models/coordinates'
import { defaultTheme } from './Theme'
import { useNavigate } from 'react-router-dom'
import { Button, debounce } from '@mui/material'
import { TreeShort } from '../../shared/models/tree-short'
import { MapsAutocomplete } from '../MapsAutocomplete/MapsAutocomplete'
import { treeStatusColorsMap } from '../../shared/consts/treeStatusColorsMap'
import API from '../../shared/services/api'
import { useGlobalContext } from '../../shared/context/GlobalContext'

const containerStyle = {
  width: '100%',
  height: '100%',
}

const optionsClusterer = {
  imagePath:
    'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m', // so you must have m1.png, m2.png, m3.png, m4.png, m5.png and m6.png in that folder
}

const defaultOptions = {
  panControl: true,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  clickableIcons: false,
  keyboardShortcuts: false,
  scrollWheel: false,
  disableDoubleClickZoom: false,
  fullscreenControl: false,
  styles: defaultTheme,
}

export const Map = ({ handleCreateTree }: any) => {
  const { trees, setTrees, filterIpn, setFilterIpn } = useGlobalContext()
  const mapRef = useRef<google.maps.Map | undefined>(undefined)
  const [createTreeLatLng, setCreateTreeLatLng] =
    useState<google.maps.LatLng | null>(null)
  const [clickXY, setClickXY] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState<number>(15)
  const [center, setCenter] = useState<Coordinates>({
    lat: 49.233083,
    lng: 28.468217,
  })
  const navigate = useNavigate()

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map
  }, [])

  const onUnmount = useCallback(function callback() {
    mapRef.current = undefined
  }, [])

  const onClick = useCallback(function callback(
    event: google.maps.MapMouseEvent
  ) {
    setCreateTreeLatLng(event.latLng)
    if ('screenX' in event.domEvent) {
      setClickXY({ x: event.domEvent.screenX, y: event.domEvent.screenY })
    }
  },
  [])

  const fetch = useCallback(
    (
      bounds: google.maps.LatLngBoundsLiteral | null,
      filterIpn: string | null
    ) => {
      let params = {}

      if (!filterIpn && bounds) {
        const startY = Math.min(bounds.west, bounds.east)
        const startX = Math.min(bounds.north, bounds.south)
        const endY = Math.max(bounds.west, bounds.east)
        const endX = Math.max(bounds.north, bounds.south)

        params = { startY, startX, endY, endX }
      } else if (!bounds && filterIpn) {
        params = { registration_number: filterIpn }
      } else {
        return
      }

      API.get<TreeShort[]>('/trees', {
        params,
      })
        .then((res) => res.data)
        .then((trees) => {
          if (trees.length === 1 && filterIpn) {
            const tree = trees[0]
            setCenter({ lng: tree.y, lat: tree.x })
          }
          setTrees(trees)
        })
    },
    [setTrees, filterIpn]
  )

  const onDebounce = useMemo(
    () =>
      debounce((callback) => {
        callback()
      }, 1000),
    []
  )

  const onValueChanges = useCallback(
    function callback(value: Coordinates) {
      setCenter(value)
    },
    [setCenter]
  )

  const onZoomChanged = useCallback(
    function callback() {
      if (mapRef.current) {
        onDebounce(() => {
          const zoom = mapRef.current?.getZoom()
          zoom && setZoom(zoom)
        })
      }
    },
    [onDebounce]
  )

  const onBoundsChanged = useCallback(
    function callback() {
      if (mapRef.current) {
        onDebounce(() => {
          const newZoom = mapRef.current?.getZoom()
          const bounds = mapRef.current?.getBounds()?.toJSON()
          if (bounds && newZoom && newZoom <= zoom) {
            fetch(bounds, filterIpn)
            setFilterIpn(null)
          }
          newZoom && setZoom(newZoom)
        })
      }
    },
    [onDebounce, fetch, zoom, filterIpn]
  )

  const openCreateTree = useCallback(() => {
    handleCreateTree(createTreeLatLng?.toJSON())
  }, [createTreeLatLng, handleCreateTree])

  useEffect(() => {
    navigate('/' + center.lat + ',' + center.lng)
    setClickXY(null)
    setCreateTreeLatLng(null)
  }, [center, navigate])

  useEffect(() => {
    fetch(null, filterIpn)
  }, [filterIpn])

  return (
    <Container>
      {clickXY && (
        <CreateTree x={clickXY.x} y={clickXY.y}>
          <Button variant={'contained'} onClick={openCreateTree}>
            Додати дерево
          </Button>
          <Button
            sx={{
              marginLeft: '.5rem',
              height: '40px',
              padding: '6px 12px 6px 8px',
              display: 'inline-block',
              minWidth: '0px',
              span: {
                marginLeft: '0',
              },
            }}
            endIcon={<CloseButton />}
            onClick={() => {
              setClickXY(null)
              setCreateTreeLatLng(null)
            }}
          />
        </CreateTree>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        options={defaultOptions}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onClick}
        onZoomChanged={onZoomChanged}
        onBoundsChanged={onBoundsChanged}
      >
        <div>
          <div>
            <MarkerClusterer options={optionsClusterer}>
              {(clusterer) => (
                <>
                  {trees.map((tree, index) => {
                    return (
                      <Marker
                        key={index}
                        clusterer={clusterer}
                        position={{ lng: tree.y, lat: tree.x }}
                        options={{ visible: false }}
                        children={
                          <Circle
                            key={index}
                            onClick={() => navigate(`/tree/${tree.id}`)}
                            center={{ lng: tree.y, lat: tree.x }}
                            radius={tree.radius}
                            options={{
                              fillColor: treeStatusColorsMap[tree.state],
                              strokeWeight: 1,
                              fillOpacity: 0.7,
                              visible: true,
                            }}
                          />
                        }
                      />
                    )
                  })}
                </>
              )}
            </MarkerClusterer>
          </div>

          <MapsAutocomplete valueChanges={onValueChanges} />

          {createTreeLatLng && <Marker position={createTreeLatLng.toJSON()} />}
        </div>
      </GoogleMap>
    </Container>
  )
}
