import { useState, useEffect } from "react";
import { isPlatform } from "@ionic/react";

import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Storage } from "@capacitor/storage";
import { Capacitor } from "@capacitor/core";

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}
const PHOTO_STORAGE = "photos";
export function usePhotoGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  const savePicture = async (photo: Photo, fileName: string) => {
    // const base64Data = await base64FromPath(photo.webPath!);
    // const savedFile = await Filesystem.writeFile({
    //   path: fileName,
    //   data: base64Data,
    //   directory: Directory.Data,
    // });

    // // Use webPath to display the new image instead of base64 since it's
    // // already loaded into memory
    // return {
    //   path: fileName,
    //   webPath: photo.webPath,
    // };
    let base64Data: string;
    // "hybrid" will detect Cordova or Capacitor;
    if (isPlatform("hybrid")) {
      const file = await Filesystem.readFile({
        path: photo.path!,
      });
      base64Data = file.data;
    } else {
      base64Data = await base64FromPath(photo.webPath!);
    }
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });
    if (isPlatform("hybrid")) {
      // Display the new image by rewriting the 'file://' path to HTTP
      // Details: https://ionicframework.com/docs/building/webview#file-protocol
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    } else {
      // Use webPath to display the new image instead of base64 since it's
      // already loaded into memory
      return {
        filepath: fileName,
        webviewPath: photo.webPath,
      };
    }
  };
  const readSecretFile = async (fileName: string) => {
    const contents = await Filesystem.readFile({
      path: fileName,
      directory: Directory.Documents,
    });

    console.log("secrets:", contents);
  };
  async function base64FromPath(path: string): Promise<string> {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject("method did not return a string");
        }
      };
      reader.readAsDataURL(blob);
    });
  }

  useEffect(() => {
    const loadSaved = async () => {
      const { value } = await Storage.get({ key: PHOTO_STORAGE });
      const photosInStorage = (value ? JSON.parse(value) : []) as Photo[];

      // for (let photo of photosInStorage) {
      //   if (photo.path) {
      //     const file = await Filesystem.readFile({
      //       path: photo.path,
      //       directory: Directory.Data,
      //     });
      //     console.log({ file });
      //     photo.webPath = `data:image/jpeg;base64,${file.data}`;
      //   }
      //   // Web platform only: Load the photo as base64 data
      // }
      // setPhotos(photosInStorage);
      // If running on the web...
      if (!isPlatform("hybrid")) {
        for (let photo of photosInStorage) {
          if (photo.path) {
            const file = await Filesystem.readFile({
              path: photo.path,
              directory: Directory.Data,
            });
            // Web platform only: Load the photo as base64 data
            photo.webPath = `data:image/jpeg;base64,${file.data}`;
          }
        }
      }
      setPhotos(photosInStorage);
    };
    loadSaved();
  }, []);

  const takePhoto = async () => {
    const cameraPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });
    console.log(cameraPhoto);
    const fileName = new Date().getTime() + ".jpeg";
    const savedFileImage = await savePicture(cameraPhoto, fileName);
    const newPhotos = [savedFileImage, ...photos] as Photo[];
    setPhotos(newPhotos);
    Storage.set({ key: PHOTO_STORAGE, value: JSON.stringify(newPhotos) });
    readSecretFile(fileName);
  };
  console.log(photos);
  return {
    photos,
    takePhoto,
  };
}
