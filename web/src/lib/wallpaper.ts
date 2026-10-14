export interface WallpaperOption {
  id: string;
  name: string;
  description: string;
  src: string;
  position: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'midnight-blue',
    name: 'Midnight',
    description: 'Moonlit valley',
    src: '/wallpaper/midnight-blue.jpg',
    position: 'center center',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights',
    src: '/wallpaper/aurora.jpg',
    position: 'center center',
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Desert blue hour',
    src: '/wallpaper/ember.jpg',
    position: 'center center',
  },
  {
    id: 'mist',
    name: 'Mist',
    description: 'Forest lake',
    src: '/wallpaper/mist.jpg',
    position: 'center center',
  },
];

export function wallpaperById(id: string): WallpaperOption {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? WALLPAPERS[0];
}
