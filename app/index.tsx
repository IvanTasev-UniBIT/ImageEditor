import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Text, TouchableHighlight, View } from 'react-native';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

const ImageButton = ({ text, icon, onPressCallback }) => {
  return (
    <TouchableHighlight onPress={onPressCallback} className='border-2 border-primary rounded-2xl p-4 m-2 w-4/6'>
      <View className='justify-center items-center'>
        <Icon name={icon} size={30} color='white' />
        <Text className='color-white text-2xl'>{text}</Text>
      </View>
    </TouchableHighlight>
  )
}

const Index = () => {
  const [imageUri, setImageUri] = useState(null);
  const router = useRouter();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1
    });

    if(!result.canceled) {
      const uri = result.assets[0].uri
      setImageUri(uri);
      router.push({ pathname: '/edit', params: { imageUri: uri } });
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if(status !== 'granted') {
      alert('Camera permission is needed to take photos.');
      return;
    }
  
    let result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if(!result.canceled) {
      const uri = result.assets[0].uri;
      router.push({ pathname: '/edit', params: { imageUri: uri } });
    }
  }

  return (
    <SafeAreaView className='flex-1 justify-center items-center bg-[#121224]'>
      <Text className='text-5xl color-white font-bold mb-4'>Image Editor</Text>
      <Text className='text-1xl color-primary mb-20'>(c) Ivan Tasev 199knr</Text>
      <ImageButton text='Import from gallery' icon='image' onPressCallback={pickImage}/>
      <ImageButton text='Take a photo' icon='camera' onPressCallback={takePhoto}/>
      <StatusBar style='light'/>
    </SafeAreaView>
  );
}

export default Index;