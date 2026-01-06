import { NotificationCreatedDTO } from "../models/dto/notification-created.dto.js";

export interface NotificationProvider {
  supports(channel: string): boolean;
  send(event: NotificationCreatedDTO): Promise<void>;
}
