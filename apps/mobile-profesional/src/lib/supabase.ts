import { getSupabaseClient } from "@geras/shared";
import Constants from "expo-constants";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

export const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
