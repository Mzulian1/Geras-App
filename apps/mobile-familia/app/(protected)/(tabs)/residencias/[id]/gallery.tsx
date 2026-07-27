import { useLocalSearchParams } from "expo-router";
import { FlatList, Image, Text, View, useWindowDimensions } from "react-native";
import { useResidenceImages } from "@/hooks/useResidencesCatalog";
import { LoadingScreen } from "@/components/LoadingScreen";

// Galería de imágenes a pantalla completa, una por fila (scroll
// vertical) — suficiente para el volumen de fotos de una residencia,
// sin agregar una librería de carrusel nueva.
export default function ResidenceGalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const imagesQuery = useResidenceImages(id);
  const { width } = useWindowDimensions();

  if (imagesQuery.isPending) return <LoadingScreen />;

  const images = imagesQuery.data ?? [];

  return (
    <View className="flex-1 bg-black">
      <FlatList
        data={images}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 60, paddingBottom: 40 }}
        ListEmptyComponent={<Text className="text-center text-gray-300">Sin imágenes disponibles.</Text>}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.url }}
            style={{ width, height: width }}
            resizeMode="contain"
            accessibilityLabel={item.alt_text ?? undefined}
          />
        )}
      />
    </View>
  );
}
