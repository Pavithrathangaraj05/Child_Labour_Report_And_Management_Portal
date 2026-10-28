import HomeWork from '@mui/icons-material/HomeWork';
import Storefront from '@mui/icons-material/Storefront';
import PanTool from '@mui/icons-material/PanTool';
import Agriculture from '@mui/icons-material/Agriculture';
import Factory from '@mui/icons-material/Factory';
import Restaurant from '@mui/icons-material/Restaurant';
import Construction from '@mui/icons-material/Construction';
import HelpOutline from '@mui/icons-material/HelpOutline';
import { ReactNode } from 'react';

export const awareness: { title: string; icon: ReactNode; text: string }[] = [
  { title: 'Domestic Child Labour', icon: <HomeWork />, text: 'Children cleaning, cooking or caring for others in private homes, often unseen and out of school.' },
  { title: 'Street Vending', icon: <Storefront />, text: 'Children selling flowers, toys, water or small goods at signals, bus stands and markets.' },
  { title: 'Begging', icon: <PanTool />, text: 'Children made to beg, sometimes by adults who are not their family.' },
  { title: 'Agricultural Labour', icon: <Agriculture />, text: 'Children working in fields, plantations or with livestock during school hours or for long days.' },
  { title: 'Factory / Industrial Work', icon: <Factory />, text: 'Children in workshops, mills and units where machinery, dust or chemicals are present.' },
  { title: 'Shops & Restaurants', icon: <Restaurant />, text: 'Children washing dishes, serving, loading or cleaning in tea stalls, hotels, garages and shops.' },
  { title: 'Construction Work', icon: <Construction />, text: 'Children carrying material or helping on building sites, often with migrant families.' },
  { title: 'Other Exploitative Work', icon: <HelpOutline />, text: 'Any work that harms a child, keeps them from school, or is forced, whatever it looks like.' },
];
