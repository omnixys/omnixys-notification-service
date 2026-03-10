import { registerEnumType } from '@nestjs/graphql';
import {
  ContactOptionsType,
  GenderType,
  InterestType,
  MaritalStatusType,
  PersonStatus,
  PhoneNumberType,
  RelationshipType,
  StatusType,
  UserType,
} from '@omnixys/contracts';

registerEnumType(ContactOptionsType, {
  name: 'ContactOptionsType',
  description: 'Defines preferred communication channels for a user.',
});

registerEnumType(GenderType, {
  name: 'GenderType',
  description: 'Specifies the gender of a person.',
});

registerEnumType(InterestType, {
  name: 'InterestType',
  description: 'Represents areas of interest associated with a user.',
});

registerEnumType(MaritalStatusType, {
  name: 'MaritalStatusType',
  description: 'Specifies the marital status of a person.',
});

registerEnumType(PersonStatus, {
  name: 'PersonStatus',
  description: 'Represents the current lifecycle state of a user.',
});

registerEnumType(PhoneNumberType, {
  name: 'PhoneNumberType',
  description: 'Specifies the type/category of a phone number.',
});

registerEnumType(RelationshipType, {
  name: 'RelationshipType',
  description: 'Defines the type of relationship between two users.',
});

registerEnumType(StatusType, {
  name: 'StatusType',
  description: 'Represents a business or account-related status.',
});

registerEnumType(UserType, {
  name: 'UserType',
  description: 'Specifies the category of a user (customer, employee, guest).',
});
