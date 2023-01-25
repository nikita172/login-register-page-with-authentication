import React from 'react'
import { Link } from "react-router-dom"
import { Avatar, ButtonGroup, colors, CopyRightText, ExtraText, StyledFormArea, StyledFormButton, StyledLabel, StyledTextInput, StyledTitle, TextLink } from '../../components/Styles'
import Logo from "../../assets/logo.png"
import { Formik, Form } from "formik"
import { TextInput } from '../../components/Formlib'
import * as Yup from "yup";

//icon
import { FiMail, FiLock } from "react-icons/fi"
function Login() {
    return (
        <div>

            <StyledFormArea>
                <Avatar image={Logo} />
                <StyledTitle color={colors.theme} size={30}>
                    Member Login
                </StyledTitle>
                <Formik
                    initialValues={{
                        email: "",
                        password: ""
                    }}
                    validationSchema={
                        Yup.object({
                            email: Yup.string().email("Invalid email address").required("This field is required*"),
                            password: Yup.string().min(8, "Password is too short").max(30, "Password is too long").required("This field is required*"),
                        })
                    }
                    onSubmit={(values, { setSubmitting }) => {
                        console.log(values);
                    }}
                >
                    {() => (
                        <Form>
                            <TextInput name="email"
                                type="text"
                                label="Email Address"
                                placeholder="Emma@gmail.com"
                                icon={<FiMail />}
                            />
                            <TextInput name="password"
                                type="password"
                                label="password"
                                placeholder="********"
                                icon={<FiLock />}
                            />
                            <ButtonGroup>
                                <StyledFormButton type='submit'>Login</StyledFormButton>
                            </ButtonGroup>

                        </Form>
                    )}

                </Formik>
                <ExtraText>
                    New here?
                    <TextLink to="/signup">
                        Signup
                    </TextLink>
                </ExtraText>

            </StyledFormArea>
            <CopyRightText>
                All rights reserved &copy;2022
            </CopyRightText>

        </div>
    )
}

export default Login