import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { Blur, Canvas, ColorMatrix, Shadow, Image as SkImage, useImage } from "@shopify/react-native-skia";
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Slider } from 'react-native-awesome-slider';
import { runOnJS, useAnimatedReaction, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Edit = () => {
  {/* VARIABLES */}
  const { imageUri } = useLocalSearchParams();
  const img = useImage(imageUri);

  const [activeMenu, setActiveMenu] = useState(null);
  const [activeProperty, setActiveProperty] = useState(null);
  const [activeFilter, setActiveFilter] = useState('default');

  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });

  const [angle, setAngle] = useState(0);
  const [scale, setScale] = useState(1);
  const [flip, setFlip] = useState(0);

  const fitScale = useDerivedValue(() => {
    const w = img ? img.width() : 0;
    const h = img ? img.height() : 0;
    const cw = canvasLayout.width.toFixed(0);
    const ch = canvasLayout.height.toFixed(0);
    const a  = (angle * Math.PI) / 180;

    const angleW = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
    const angleH = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));

    return (angleW && angleH ? Math.min(cw / angleW, ch / angleH) : 1);
  }, [ angle, canvasLayout ]);

  useAnimatedReaction(() => fitScale.value, (scale) => {
    runOnJS(setScale)(scale);
  })

  const propertySize = useSharedValue({ width: 0, height: 0 });
  const propertyWidth = useDerivedValue(() => propertySize.value.width);
  const propertyHeight = useDerivedValue(() => propertySize.value.height);

  {/* MATRIX */}
  const defaultMatrix = [ 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0 ]

  const brightness = useSharedValue(0);
  const contrast = useSharedValue(1);
  const saturation = useSharedValue(1);
  const hue = useSharedValue(0);
  const temperature = useSharedValue(0);
  const tint = useSharedValue(0);
  const blur = useSharedValue(0);
  const vignette = useSharedValue(0);

  const [filterMatrix, setFilterMatrix] = useState(defaultMatrix);

  const [bcMatrix, setBCMatrix] = useState([]);
  const [sMatrix, setSMatrix] = useState([]);
  const [hMatrix, setHMatrix] = useState([]);
  const [temMatrix, setTemMatrix] = useState([]);
  const [tiMatrix, setTiMatrix] = useState([]);
  const [blurFilter, setBlurFilter] = useState(0);
  const [vigFilter, setVigFilter] = useState(0);

  const matrices = useDerivedValue(() => {
    const b = brightness.value;
    const c = contrast.value;
    const s = saturation.value;
    const h = hue.value;
    const tem = temperature.value;
    const ti = tint.value;

    const t = (1-c) / 2;

    const lr = 0.213;
    const lg = 0.715;
    const lb = 0.072;

    const sr = (1-s) * lr;
    const sg = (1-s) * lg;
    const sb = (1-s) * lb;

    const hRad = h / 180 * Math.PI;
    const hCos = Math.cos(hRad);
    const hSin = Math.sin(hRad);
    
    const h00 = lr + hCos * (1-lr) + hSin * (-lr);
    const h01 = lg + hCos * (-lg) + hSin * (-lg);
    const h02 = lb + hCos * (-lb) + hSin * (1-lb);
    const h10 = lr + hCos * (-lr) + hSin * (0.143);
    const h11 = lg + hCos * (1-lg) + hSin * (0.140);
    const h12 = lb + hCos * (-lb) + hSin * (-0.283);
    const h20 = lr + hCos * (-lr) + hSin * (-(1-lr));
    const h21 = lg + hCos * (-lg) + hSin * (lg);
    const h22 = lb + hCos * (1-lb) + hSin * (lb);

    const BC = [
      c, 0, 0, 0, t+b,
      0, c, 0, 0, t+b,
      0, 0, c, 0, t+b,
      0, 0, 0, 1, 0
    ];

    const S = [
      sr+s, sg, sb, 0, 0,
      sr, sg+s, sb, 0, 0,
      sr, sg, sb+s, 0, 0,
      0, 0, 0, 1, 0
    ];

    const H = [
      h00, h01, h02, 0, 0,
      h10, h11, h12, 0, 0,
      h20, h21, h22, 0, 0,
      0, 0, 0, 1, 0
    ];

    const TEM = [
      1 + 0.2 * tem, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1 - 0.2 * tem, 0, 0,
      0, 0, 0, 1, 0
    ];

    const TI = [
      1, 0, 0, 0, 0,
      0, 1 + 0.2 * ti, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 1, 0
    ];

    const BLUR = blur.value * 25;
    const VIG = vignette.value * 500;

    return { BC, S, H, TEM, TI, BLUR, VIG };
  }, [brightness, contrast, saturation, hue, temperature, blur, vignette]);

  useAnimatedReaction(() => matrices.value, (mats) => {
    runOnJS(setBCMatrix)(mats.BC);
    runOnJS(setSMatrix)(mats.S);
    runOnJS(setHMatrix)(mats.H);
    runOnJS(setTemMatrix)(mats.TEM);
    runOnJS(setTiMatrix)(mats.TI);
    runOnJS(setBlurFilter)(mats.BLUR);
    runOnJS(setVigFilter)(mats.VIG);
  });

  {/* FUNCTIONS */}
  const resetCallback = () => {
    brightness.value = 0;
    contrast.value = 1;
    saturation.value = 1;
    hue.value = 0;
    temperature.value = 0;
    tint.value = 0;
    setActiveFilter('default');
    setFilterMatrix(defaultMatrix);
    setAngle(0);
    setFlip(0);
  }

  const saveImage = () => {
    alert("WIP");
  }

  {/* BUTTONS */}
  const footerLeftButtons = [
    { id: 'adjustments', icon: 'format-list-checkbox', label: 'Adjustments' },
    { id: 'filters', icon: 'texture', label: 'Filters' }
  ];

  const footerRightButtons = [
    { id: 'rotate', icon: 'format-rotate-90', label: 'Rotate', callback: () => setAngle((prev) => prev - 90) },
    { id: 'flip', icon: 'flip-horizontal', label: 'Flip', callback: () => setFlip((prev) => (prev === 0 ? Math.PI : 0)) },
    { id: 'reset', icon: 'restart', label: 'Reset', callback: resetCallback },
  ]
  
  const menuProperties = {
    adjustments: [
      { id: 'brightness', label: 'Brightness', progress: brightness, min: useSharedValue(-1), max: useSharedValue(1), matrix: [ 1, 0, 0, 0, 0.25, 0, 1, 0, 0, 0.25, 0, 0, 1, 0, 0.25, 0, 0, 0, 1, 0 ] },
      { id: 'contrast', label: 'Contrast', progress: contrast, min: useSharedValue(0), max: useSharedValue(2), matrix: [ 1.75, 0, 0, 0, -0.375, 0, 1.75, 0, 0, -0.375, 0, 0, 1.75, 0, -0.375, 0, 0, 0, 1, 0 ] },
      { id: 'saturation', label: 'Saturation', progress: saturation, min: useSharedValue(0), max: useSharedValue(2), matrix: [0.413, 0.533, 0.053, 0, 0, 0.159, 0.788, 0.053, 0, 0, 0.159, 0.533, 0.308, 0, 0, 0, 0, 0, 1, 0] },
      { id: 'hue', label: 'Hue', progress: hue, min: useSharedValue(0), max: useSharedValue(360), matrix: [-0.573, 1.433, 0.140, 0, 0, 0.425, 0.429, 0.145, 0, 0, 0.429, 1.427, -0.856, 0, 0, 0, 0, 0, 1, 0] },
      { id: 'temperature', label: 'Temperature', progress: temperature, min: useSharedValue(-1), max: useSharedValue(1), matrix: [1.149, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.850, 0, 0, 0, 0, 0, 1, 0] },
      { id: 'tint', label: 'Tint', progress: tint, min: useSharedValue(-1), max: useSharedValue(1), matrix: [1, 0, 0, 0, 0, 0, 0.849, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0] },
      { id: 'blur', label: 'Blur', progress: blur, min: useSharedValue(0), max: useSharedValue(1), matrix: defaultMatrix },
      { id: 'vignette', label: 'Vignette', progress: vignette, min: useSharedValue(0), max: useSharedValue(1), matrix: defaultMatrix }
    ],
    filters: [
      { id: 'default', label: 'Default', matrix: [ 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0 ] },
      { id: 'sepium', label: 'Sepium', matrix: [ 1.3, -0.3, 1.1, 0, 0, 0, 1.3, 0.2, 0, 0, 0, 0, 0.8, 0.2, 0, 0, 0, 0, 1, 0 ] },
      { id: 'milk', label: 'Milk', matrix: [ 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0.6, 1, 0, 0, 0, 0, 0, 1, 0 ] },
      { id: 'kodachrome', label: 'Kodachrome', matrix: [ 1.128, -0.396, -0.039, 0, 0.255, -0.164, 1.083, -0.054, 0, 0.075, -0.167, -0.560, 1.601, 0, 0.175, 0, 0, 0, 1, 0 ] }
    ]
  }
  
  {/* COMPONENTS */}
  const Adjustments = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        { menuProperties[activeMenu].map((btn) => (
          <TouchableOpacity key={btn.id} onPress={() => setActiveProperty((prev) => (prev === btn.id ? null : btn.id))} className='justify-center items-center w-28 h-28'>
            <View className={`flex-1 aspect-square w-full h-full mb-2 rounded-md`}>
              <Canvas onSize={propertySize} style={{ flex: 1 }}>
                <SkImage image={img} fit="cover" x={0} y={0} width={propertyWidth} height={propertyHeight}>
                  <ColorMatrix matrix={btn.matrix} />
                  <Blur blur={(btn.id === "blur" ? 2 : 0)} />
                  <Shadow dx={0} dy={0} blur={(btn.id === "vignette" ? 20 : 0)} color="#000000" inner />
                </SkImage>
              </Canvas>
            </View>
            <Text className={`text-xs ${activeProperty === btn.id ? 'color-primary' : 'color-white'}`}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )
  }

  const Filters = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        { menuProperties[activeMenu].map((btn) => (
          <TouchableOpacity key={btn.id} onPress={() => { setActiveFilter(btn.id); setFilterMatrix(btn.matrix) }} className='justify-center items-center w-28 h-28'>
            <View className={`flex-1 aspect-square w-full h-full mb-2 rounded-md`}>
              <Canvas onSize={propertySize} style={{ flex: 1 }}>
                <SkImage image={img} fit="cover" x={0} y={0} width={propertyWidth} height={propertyHeight}>
                  <ColorMatrix matrix={btn.matrix} />
                </SkImage>
              </Canvas>
            </View>
            <Text className={`text-xs ${activeFilter === btn.id ? 'color-primary' : 'color-white'}`}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )
  }

  {/* MAIN */}
  return (
    <SafeAreaView className='flex-1 bg-[#121224]'>

      {/* HEADER */}
      <View className='flex-shrink justify-start'>
        <View className='flex-row justify-between items-center bg-accent py-2'>
          <TouchableOpacity key={'back'} onPress={() => router.back() } className='justify-center items-center mx-4'>
            <Icon name={'keyboard-backspace'} color={'white'} size={30} />
          </TouchableOpacity>
          <Text className='text-2xl font-bold color-white'>Image Editor</Text>
          <TouchableOpacity key={'save'} onPress={saveImage} className='justify-center items-center mx-4'>
            <Icon name={'content-save'} color={'white'} size={30} />
          </TouchableOpacity>
        </View>
      </View>

      {/* IMAGE */}
      { img ? (
        <ReactNativeZoomableView
            maxZoom={4}
            minZoom={1}
            zoomStep={0.5}
            initialZoom={1}
            bindToBorders={true}
            disablePanOnInitialZoom={true}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onLayout={event => { const { width, height } = event.nativeEvent.layout; setCanvasLayout({ width, height }); }}
        >
        {/* <View className='flex-1 justify-center items-center' onLayout={event => { const { width, height } = event.nativeEvent.layout; setCanvasLayout({ width, height }); }}> */}
          <Canvas style={{ flex: 1, width: '100%', height: '100%' }}>
            <SkImage image={img} x={0} y={0} width={img.width()} height={img.height()} transform={[
              { translateX: canvasLayout.width.toFixed(0) / 2 },
              { translateY: canvasLayout.height.toFixed(0) / 2 },
              { scale: scale },
              { rotateZ: (angle * Math.PI) / 180 },
              { rotateY: flip },
              { translateX: -img.width() / 2 },
              { translateY: -img.height() / 2 },
            ]} >
              <ColorMatrix matrix={bcMatrix} />
              <ColorMatrix matrix={sMatrix} />
              <ColorMatrix matrix={hMatrix} />
              <ColorMatrix matrix={temMatrix} />
              <ColorMatrix matrix={tiMatrix} />
              <ColorMatrix matrix={filterMatrix} />
              <Blur blur={blurFilter} mode={'decal'} />
              <Shadow dx={0} dy={0} blur={vigFilter} color="#000000" inner />
            </SkImage>
          </Canvas>
        {/* </View> */} 
        </ReactNativeZoomableView>
      ) : (
        <ActivityIndicator size='large' color='#fff'/>
      )}

      {/* SLIDER */}
      <View className={`${!(activeProperty && activeMenu == 'adjustments') && 'hidden'} flex-shrink justify-center items-center border-t-2 border-primary h-12`}>
        { menuProperties['adjustments'].map((slider) => (
          activeProperty === slider.id && <Slider key={slider.id} style={{ width: '75%' }} progress={slider.progress} minimumValue={slider.min} maximumValue={slider.max} />
        ))}
      </View>

      {/* PROPERTIES */}
      <View className={`${!activeMenu && 'hidden'} flex-shrink justify-center items-center border-t-2 border-primary py-4`}>
        <View className={`${!activeMenu && 'hidden'} flex-row border-primary`}>
          { activeMenu === 'adjustments' && Adjustments() }
          { activeMenu === 'filters' && Filters() }
        </View>
      </View>

      {/* FOOTER */}
      <View className='flex-shrink justify-end'>
        <View className='flex-row justify-between bg-accent py-2'>
          <View className='flex-row'>
            {footerLeftButtons.map((btn) => (
              <TouchableOpacity key={btn.id} onPress={() => { setActiveProperty(null); setActiveMenu((prev) => (prev === btn.id ? null : btn.id)) }} className='justify-center items-center mx-4'>
                <Icon name={btn.icon} color={activeMenu === btn.id ? '#8484aa' : 'white'} size={30} />
                <Text className={`mt-1 text-xs ${activeMenu === btn.id ? 'color-primary' : 'color-white'}`}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View className='flex-row'>
            {footerRightButtons.map((btn) => (
              <TouchableOpacity key={btn.id} onPress={btn.callback} className='justify-center items-center mx-4'>
                <Icon name={btn.icon} color={'white'} size={30} />
                <Text className='mt-1 text-xs color-white'>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

    </SafeAreaView>
  )
}

export default Edit