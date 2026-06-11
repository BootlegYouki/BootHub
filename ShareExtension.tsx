import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { openHostApp, close, InitialProps } from 'expo-share-extension';

export default function ShareExtension(props: InitialProps) {
  useEffect(() => {
    const handleShare = async () => {
      try {
        let type: string | null = null;
        let value: string | null = null;

        if (props.images && props.images.length > 0) {
          type = 'photo';
          value = props.images[0];
        } else if (props.files && props.files.length > 0) {
          type = 'file';
          value = props.files[0];
        } else if (props.url) {
          type = 'link';
          value = props.url;
        } else if (props.text) {
          type = 'text';
          value = props.text;
        }

        if (type && value) {
          // Send to main app via URL scheme
          const path = `share?type=${type}&value=${encodeURIComponent(value)}`;
          openHostApp(path);
          close();
        } else {
          // If no content found, close the extension
          close();
        }
      } catch (err) {
        console.error('ShareExtension error:', err);
        close();
      }
    };

    handleShare();
  }, [props]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
